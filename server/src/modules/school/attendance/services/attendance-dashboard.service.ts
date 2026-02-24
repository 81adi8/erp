// ============================================================================
// ATTENDANCE DASHBOARD SERVICE
// Business logic for attendance dashboard statistics and activity
// ============================================================================

import { Op, Sequelize } from 'sequelize';
import { 
    createAttendanceRepositories,
    StudentAttendanceRepository,
    AttendanceAuditRepository,
    AttendanceSummaryRepository
} from '../repositories/attendance.repository';
import { 
    SummaryScope, 
    SummaryPeriodType,
    AuditEntityType,
    AttendanceStatus
} from '../types/attendance.types';
import { StudentAttendance } from '../../../../database/models/school/attendance/StudentAttendance.model';
import { StudentEnrollment, StudentEnrollmentStatus } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import { Section } from '../../../../database/models/school/academics/class/Section.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { AttendanceAuditLog } from '../../../../database/models/school/attendance/AttendanceAuditLog.model';

export class AttendanceDashboardService {
    private schemaName: string;
    private institutionId: string;
    private attendanceRepo: StudentAttendanceRepository;
    private auditRepo: AttendanceAuditRepository;
    private summaryRepo: AttendanceSummaryRepository;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
        
        const repos = createAttendanceRepositories(schemaName, institutionId);
        this.attendanceRepo = repos.studentAttendance;
        this.auditRepo = repos.audit;
        this.summaryRepo = repos.summary;
    }

    /**
     * Get overall dashboard statistics for today
     */
    async getTodayStats(academicYearId: string, date: string | Date = new Date()) {
        const formattedDate = new Date(date).toISOString().split('T')[0];
        const periodStart = new Date(formattedDate);
        const periodEnd = new Date(formattedDate);

        // 1. Get school-wide summary for today
        let institutionSummary = await this.summaryRepo.getSummary({
            academicYearId,
            scope: SummaryScope.INSTITUTION,
            entityId: this.institutionId,
            periodType: SummaryPeriodType.DAILY,
            periodStart: formattedDate
        });

        // 2. If summary is missing or dirty, recalculate on the fly for proactive dashboard
        if (!institutionSummary || institutionSummary.needsRecalculation) {
            const { createAttendanceAnalyticsService } = require('./attendance-analytics.service');
            const analyticsService = createAttendanceAnalyticsService(this.schemaName, this.institutionId);
            
            await analyticsService.recalculateSummary(
                academicYearId,
                SummaryScope.INSTITUTION,
                this.institutionId,
                SummaryPeriodType.DAILY,
                periodStart,
                periodEnd
            );

            // Refetch after calculation
            institutionSummary = await this.summaryRepo.getSummary({
                academicYearId,
                scope: SummaryScope.INSTITUTION,
                entityId: this.institutionId,
                periodType: SummaryPeriodType.DAILY,
                periodStart: formattedDate
            });
        }

        // 3. Get total enrolled students (could also be cached in summary)
        const totalStudents = await StudentEnrollment.schema(this.schemaName).count({
            where: {
                institution_id: this.institutionId,
                academic_year_id: academicYearId,
                status: StudentEnrollmentStatus.ACTIVE
            }
        });

        // 4. Get previous day summary for trend calculation
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayFormatted = yesterday.toISOString().split('T')[0];

        const previousSummary = await this.summaryRepo.getSummary({
            academicYearId,
            scope: SummaryScope.INSTITUTION,
            entityId: this.institutionId,
            periodType: SummaryPeriodType.DAILY,
            periodStart: yesterdayFormatted
        });

        return {
            totalStudents,
            present: institutionSummary?.presentCount || 0,
            absent: institutionSummary?.absentCount || 0,
            late: institutionSummary?.lateCount || 0,
            excused: institutionSummary?.excusedCount || 0,
            attendanceRate: institutionSummary?.attendancePercentage || 0,
            previousRate: previousSummary?.attendancePercentage || 0,
            date: formattedDate
        };
    }

    /**
     * Get recent attendance activity (audit logs)
     */
    async getRecentActivity(limit: number = 10) {
        const activities = await this.auditRepo.getHistory(
            AuditEntityType.STUDENT_ATTENDANCE,
            '%', // Wildcard for all entities if supported by repo, otherwise we might need a general query
            limit
        );

        return activities.map(activity => ({
            id: activity.id,
            type: activity.action === 'CREATE' ? 'marking' : activity.action === 'UPDATE' ? 'edit' : 'alert',
            title: this.getActivityTitle(activity),
            subtitle: activity.reason || '',
            time: activity.createdAt,
            status: this.getActivityStatus(activity)
        }));
    }

    /**
     * Get class-wise attendance summary for today
     */
    async getClassSummary(academicYearId: string, date: string | Date = new Date()) {
        const formattedDate = new Date(date).toISOString().split('T')[0];

        // 1. Get all sections for the institution with class info
        const sections = await Section.schema(this.schemaName).findAll({
            where: { institution_id: this.institutionId },
            include: [
                { model: Class.schema(this.schemaName), as: 'class' }
            ]
        });

        // 2. Get student enrollment counts grouped by section (batch query to avoid N+1)
        const studentCounts = await StudentEnrollment.schema(this.schemaName).findAll({
            where: {
                institution_id: this.institutionId,
                academic_year_id: academicYearId,
                status: StudentEnrollmentStatus.ACTIVE
            },
            attributes: [
                'section_id',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['section_id'],
            raw: true
        }) as unknown as Array<{ section_id: string, count: string }>;

        const enrollmentMap = new Map(studentCounts.map(c => [c.section_id, parseInt(c.count, 10)]));

        // 3. Get daily summaries for these sections
        const summaries = await this.summaryRepo.list({
            academicYearId,
            scope: SummaryScope.SECTION,
            periodType: SummaryPeriodType.DAILY,
            periodStart: formattedDate
        });

        const summaryMap = new Map(summaries.map(s => [s.entityId, s]));

        // 4. Get monthly summaries for trend (batch query)
        const monthStart = new Date(date);
        monthStart.setDate(1);
        const monthFormatted = monthStart.toISOString().split('T')[0];
        
        const monthlySummaries = await this.summaryRepo.list({
            academicYearId,
            scope: SummaryScope.SECTION,
            periodType: SummaryPeriodType.MONTHLY,
            periodStart: monthFormatted
        });

        const monthlyMap = new Map(monthlySummaries.map(s => [s.entityId, s]));

        // 5. Enrich and format
        return sections.map((section) => {
            const todaySum = summaryMap.get(section.id);
            const monthSum = monthlyMap.get(section.id);
            const totalStudents = enrollmentMap.get(section.id) || 0;

            return {
                id: section.id,
                name: section.class?.name || 'Unknown',
                section: section.name || 'Unknown',
                totalStudents: totalStudents || todaySum?.totalStudents || 0,
                avgRate: monthSum?.attendancePercentage || todaySum?.attendancePercentage || 0,
                todayRate: todaySum?.attendancePercentage || 0,
                trend: monthSum ? (todaySum?.attendancePercentage || 0) - monthSum.attendancePercentage : 0,
                classTeacher: 'Assigned Teacher', // Placeholder or fetch from section/class teacher link
            };
        });
    }

    /**
     * Get class-wise attendance history
     */
    async getClassAttendanceHistory(academicYearId: string, startDate: string | Date, endDate: string | Date) {
        // 1. Get all section summaries for the period using optimized range query
        const summaries = await this.summaryRepo.list({
            academicYearId,
            scope: SummaryScope.SECTION,
            periodType: SummaryPeriodType.DAILY,
            startDate,
            endDate
        });

        if (summaries.length === 0) return [];

        // 2. Fetch all unique sections/classes involved (batch query)
        const sectionIds = [...new Set(summaries.map(s => s.entityId))];
        const sectionsSet = await Section.schema(this.schemaName).findAll({
            where: { id: { [Op.in]: sectionIds } },
            include: [{ model: Class.schema(this.schemaName), as: 'class' }]
        });

        const sectionMap = new Map(sectionsSet.map(s => [s.id, s]));

        // 3. Enrich History
        return summaries.map((summary) => {
            const section = sectionMap.get(summary.entityId);

            return {
                id: summary.id,
                date: summary.periodStart,
                className: section?.class?.name || 'Unknown',
                section: section?.name || 'Unknown',
                total: summary.totalStudents,
                present: summary.presentCount,
                absent: summary.absentCount,
                late: summary.lateCount,
                excused: summary.excusedCount,
                rate: summary.attendancePercentage,
                markedBy: 'System', // This should come from student_attendance table or audit
                markedAt: summary.lastCalculatedAt,
                isLocked: false // This should come from student_attendance table
            };
        });
    }

    private getActivityStatus(activity: AttendanceAuditLog): string {
        const status = activity.newValues?.status;
        return typeof status === 'string' ? status.toLowerCase() : 'present';
    }

    private getActivityTitle(activity: AttendanceAuditLog): string {
        switch (activity.action) {
            case 'CREATE': return 'Attendance marked';
            case 'UPDATE': return 'Attendance updated';
            case 'LOCK': return 'Attendance locked';
            default: return 'Attendance activity';
        }
    }
}

export function createAttendanceDashboardService(schemaName: string, institutionId: string) {
    return new AttendanceDashboardService(schemaName, institutionId);
}

