// ============================================================================
// ATTENDANCE ANALYTICS SERVICE
// Handles real-time and batch aggregation of attendance data into summaries
// ============================================================================

import { Transaction, Op, Sequelize, WhereOptions } from 'sequelize';
import { 
    createAttendanceRepositories,
    AttendanceSummaryRepository,
    StudentAttendanceRepository
} from '../repositories/attendance.repository';
import { 
    SummaryScope, 
    SummaryPeriodType,
    AttendanceStatus,
    ATTENDANCE_COUNT_VALUES
} from '../types/attendance.types';
import { AttendanceSummary } from '../../../../database/models/school/attendance/AttendanceSummary.model';
import { StudentAttendance } from '../../../../database/models/school/attendance/StudentAttendance.model';
import { StudentEnrollment, StudentEnrollmentStatus } from '../../../../database/models/school/academics/student/StudentEnrollment.model';

export class AttendanceAnalyticsService {
    private schemaName: string;
    private institutionId: string;
    private summaryRepo: AttendanceSummaryRepository;
    private attendanceRepo: StudentAttendanceRepository;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
        
        const repos = createAttendanceRepositories(schemaName, institutionId);
        this.summaryRepo = repos.summary;
        this.attendanceRepo = repos.studentAttendance;
    }

    /**
     * Recalculate summary for a specific entity and period
     */
    async recalculateSummary(
        academicYearId: string,
        scope: SummaryScope,
        entityId: string,
        periodType: SummaryPeriodType,
        periodStart: Date,
        periodEnd: Date,
        transaction?: Transaction
    ): Promise<void> {
        // 1. Build Query for raw attendance records
        const where: WhereOptions = {
            institutionId: this.institutionId,
            academicYearId,
            date: { [Op.between]: [periodStart, periodEnd] },
            isDeleted: false
        };

        if (scope === SummaryScope.STUDENT) {
            (where as Record<string, unknown>).studentId = entityId;
        } else if (scope === SummaryScope.SECTION) {
            (where as Record<string, unknown>).sectionId = entityId;
        } else if (scope === SummaryScope.CLASS) {
            (where as Record<string, unknown>).classId = entityId;
        }

        // 2. Fetch actual working days from calendar for the period
        const { academicCalendarService }: {
            academicCalendarService: {
                getCalendarRange: (
                    schemaName: string,
                    institutionId: string,
                    startDate: Date,
                    endDate: Date,
                    sessionId: string
                ) => Promise<Record<string, { status: string; date: string }>>;
            };
        } = require('../../academic/services/calendar/academic-calendar.service');
        const calendarRange = await academicCalendarService.getCalendarRange(
            this.schemaName,
            this.institutionId,
            periodStart,
            periodEnd,
            academicYearId
        );

        const workingDates = Object.values(calendarRange)
            .filter((d) => d.status === 'WORKING')
            .map((d) => d.date);
        
        const totalWorkingDays = workingDates.length;

        // 3. Aggregate counts from database
        const stats = await StudentAttendance.schema(this.schemaName).findAll({
            where,
            attributes: [
                'status',
                'date',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                [Sequelize.fn('SUM', Sequelize.col('count_value')), 'weighted_sum']
            ],
            group: ['status', 'date'],
            raw: true,
            transaction
        }) as unknown as Array<{ status: AttendanceStatus; date: string; count: string; weighted_sum: string }>;

        // 3. Process Stats
        let totals = {
            present: 0,
            absent: 0,
            late: 0,
            halfDay: 0,
            leave: 0,
            excused: 0,
            totalWorking: totalWorkingDays, // From calendar
            weightedSum: 0
        };

        for (const s of stats) {
            const count = parseInt(s.count, 10);
            const weighted = parseFloat(s.weighted_sum || '0');

            // Only count weighted sum and specific status counts
            // Note: totalWorkingDays is already computed from the calendar
            totals.weightedSum += weighted;

            switch (s.status) {
                case AttendanceStatus.PRESENT: totals.present += count; break;
                case AttendanceStatus.ABSENT: totals.absent += count; break;
                case AttendanceStatus.LATE: totals.late += count; break;
                case AttendanceStatus.HALF_DAY: totals.halfDay += count; break;
                case AttendanceStatus.LEAVE: totals.leave += count; break;
                case AttendanceStatus.EXCUSED: totals.excused += count; break;
            }
        }

        // 4. Get active student count for this scope to calculate accurate percentage
        let entityStudentCount = 1;

        if (scope === SummaryScope.SECTION) {
            entityStudentCount = await StudentEnrollment.schema(this.schemaName).count({
                where: { institution_id: this.institutionId, academic_year_id: academicYearId, section_id: entityId, status: StudentEnrollmentStatus.ACTIVE }
            });
        } else if (scope === SummaryScope.CLASS) {
            entityStudentCount = await StudentEnrollment.schema(this.schemaName).count({
                where: { institution_id: this.institutionId, academic_year_id: academicYearId, class_id: entityId, status: StudentEnrollmentStatus.ACTIVE }
            });
        } else if (scope === SummaryScope.INSTITUTION) {
            entityStudentCount = await StudentEnrollment.schema(this.schemaName).count({
                where: { institution_id: this.institutionId, academic_year_id: academicYearId, status: StudentEnrollmentStatus.ACTIVE }
            });
        }

        const totalCapacity = totals.totalWorking * (entityStudentCount || 1);
        const percentage = totalCapacity > 0 
            ? (totals.weightedSum / totalCapacity) * 100 
            : 0;

        // 5. Update or Create Summary
        await this.summaryRepo.upsert({
            academicYearId,
            scope,
            entityId,
            periodType,
            periodStart,
            periodEnd,
            totalWorkingDays: totals.totalWorking,
            totalStudents: entityStudentCount,
            presentCount: totals.present,
            absentCount: totals.absent,
            lateCount: totals.late,
            halfDayCount: totals.halfDay,
            leaveCount: totals.leave,
            excusedCount: totals.excused,
            attendancePercentage: Math.round(percentage * 100) / 100,
            weightedAttendance: totals.weightedSum,
            lastCalculatedAt: new Date(),
            needsRecalculation: false
        }, transaction);
    }

    /**
     * Batch recalculate for all entities that need it
     */
    async processPendingRecalculations(academicYearId: string): Promise<number> {
        // Find all summaries marked as dirty
        const dirtySummaries = await AttendanceSummary.schema(this.schemaName).findAll({
            where: {
                institutionId: this.institutionId,
                academicYearId,
                needsRecalculation: true
            }
        });

        for (const summary of dirtySummaries) {
            await this.recalculateSummary(
                academicYearId,
                summary.scope,
                summary.entityId,
                summary.periodType,
                summary.periodStart,
                summary.periodEnd
            );
        }

        return dirtySummaries.length;
    }

    /**
     * Trigger session-wide analytics aggregation
     * This creates summaries for the whole year/session
     */
    async recalculateSessionSummary(
        academicYearId: string,
        scope: SummaryScope,
        entityId: string,
        transaction?: Transaction
    ): Promise<void> {
        // 1. Get the session dates
        const { AcademicSession } = require('../../../../database/models/school/academics/session/AcademicSession.model');
        const session = await AcademicSession.schema(this.schemaName).findByPk(academicYearId);
        
        if (!session) return;

        // 2. Delegate to generic recalculation with Session Scope
        await this.recalculateSummary(
            academicYearId,
            scope,
            entityId,
            SummaryPeriodType.YEARLY,
            session.start_date,
            session.end_date,
            transaction
        );
    }
}

export function createAttendanceAnalyticsService(schemaName: string, institutionId: string) {
    return new AttendanceAnalyticsService(schemaName, institutionId);
}

