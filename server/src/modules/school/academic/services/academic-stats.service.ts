import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../database/models/school/academics/class/Section.model';
import { Subject } from '../../../../database/models/school/academics/curriculum/Subject.model';
import { Chapter } from '../../../../database/models/school/academics/curriculum/Chapter.model';
import { Topic } from '../../../../database/models/school/academics/curriculum/Topic.model';
import { LessonPlan, LessonPlanStatus } from '../../../../database/models/school/academics/curriculum/LessonPlan.model';
import { AcademicSession } from '../../../../database/models/school/academics/session/AcademicSession.model';
import { StudentEnrollment, StudentEnrollmentStatus } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import { ClassSubject } from '../../../../database/models/school/academics/curriculum/ClassSubject.model';
import { Op, fn, col, literal } from 'sequelize';

export interface AcademicStatsResponse {
    classes: number;
    sections: number;
    subjects: number;
    chapters: number;
    topics: number;
    totalEnrollments: number;
    classSubjectMappings: number;
    currentSession: {
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        daysRemaining: number;
        progressPercent: number;
    } | null;
    lessonPlans: {
        total: number;
        planned: number;
        ongoing: number;
        completed: number;
        cancelled: number;
        completionRate: number;
    };
    subjectDistribution: Array<{
        type: string;
        count: number;
        percentage: number;
    }>;
    classWiseEnrollment: Array<{
        classId: string;
        className: string;
        studentCount: number;
        sectionCount: number;
    }>;
    recentActivity: Array<{
        type: string;
        description: string;
        timestamp: string;
        metadata?: Record<string, unknown>;
    }>;
}

export class AcademicStatsService {
    /**
     * Get comprehensive academic statistics for an institution
     */
    async getStats(schemaName: string, institutionId: string): Promise<AcademicStatsResponse> {
        const [
            classCount,
            sectionCount,
            subjectCount,
            chapterCount,
            topicCount,
            classSubjectCount,
            currentSession,
            lessonPlanStats,
            subjectDistribution,
            classWiseEnrollment,
        ] = await Promise.all([
            this.getClassCount(schemaName, institutionId),
            this.getSectionCount(schemaName, institutionId),
            this.getSubjectCount(schemaName, institutionId),
            this.getChapterCount(schemaName, institutionId),
            this.getTopicCount(schemaName, institutionId),
            this.getClassSubjectCount(schemaName, institutionId),
            this.getCurrentSessionInfo(schemaName, institutionId),
            this.getLessonPlanStats(schemaName, institutionId),
            this.getSubjectDistribution(schemaName, institutionId),
            this.getClassWiseEnrollment(schemaName, institutionId),
        ]);

        const totalEnrollments = classWiseEnrollment.reduce((sum, c) => sum + c.studentCount, 0);

        return {
            classes: classCount,
            sections: sectionCount,
            subjects: subjectCount,
            chapters: chapterCount,
            topics: topicCount,
            totalEnrollments,
            classSubjectMappings: classSubjectCount,
            currentSession,
            lessonPlans: lessonPlanStats,
            subjectDistribution,
            classWiseEnrollment,
            recentActivity: [], // This would be populated from an activity log table
        };
    }

    private async getClassCount(schemaName: string, institutionId: string): Promise<number> {
        return await Class.schema(schemaName).count({ where: { institution_id: institutionId, is_active: true } });
    }

    private async getSectionCount(schemaName: string, institutionId: string): Promise<number> {
        return await Section.schema(schemaName).count({ where: { institution_id: institutionId, is_active: true } });
    }

    private async getSubjectCount(schemaName: string, institutionId: string): Promise<number> {
        return await Subject.schema(schemaName).count({ where: { institution_id: institutionId, is_active: true } });
    }

    private async getChapterCount(schemaName: string, institutionId: string): Promise<number> {
        return await Chapter.schema(schemaName).count({
            where: { institution_id: institutionId },
        });
    }

    private async getTopicCount(schemaName: string, institutionId: string): Promise<number> {
        return await Topic.schema(schemaName).count({
            where: { institution_id: institutionId },
        });
    }

    private async getClassSubjectCount(schemaName: string, institutionId: string): Promise<number> {
        return await ClassSubject.schema(schemaName).count({ where: { institution_id: institutionId } });
    }

    private async getCurrentSessionInfo(schemaName: string, institutionId: string): Promise<AcademicStatsResponse['currentSession']> {
        const session = await AcademicSession.schema(schemaName).findOne({
            where: { institution_id: institutionId, is_current: true },
        });

        if (!session) return null;

        const now = new Date();
        const start = new Date(session.start_date);
        const end = new Date(session.end_date);

        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

        return {
            id: session.id,
            name: session.name,
            startDate: session.start_date instanceof Date ? session.start_date.toISOString() : String(session.start_date),
            endDate: session.end_date instanceof Date ? session.end_date.toISOString() : String(session.end_date),
            daysRemaining,
            progressPercent,
        };
    }

    private async getLessonPlanStats(schemaName: string, institutionId: string): Promise<AcademicStatsResponse['lessonPlans']> {
        const plans = await LessonPlan.schema(schemaName).findAll({
            where: { institution_id: institutionId },
            attributes: ['status'],
        });

        const total = plans.length;
        const planned = plans.filter(p => p.status === LessonPlanStatus.PLANNED).length;
        const ongoing = plans.filter(p => p.status === LessonPlanStatus.ONGOING).length;
        const completed = plans.filter(p => p.status === LessonPlanStatus.COMPLETED).length;
        const cancelled = plans.filter(p => p.status === LessonPlanStatus.CANCELLED).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, planned, ongoing, completed, cancelled, completionRate };
    }

    private async getSubjectDistribution(schemaName: string, institutionId: string): Promise<AcademicStatsResponse['subjectDistribution']> {
        const subjects = await Subject.schema(schemaName).findAll({
            where: { institution_id: institutionId, is_active: true },
            attributes: ['subject_type'],
        });

        const total = subjects.length;
        const typeMap = new Map<string, number>();

        subjects.forEach(s => {
            const subjectType = s.subject_type || 'UNCATEGORIZED';
            const count = typeMap.get(subjectType) || 0;
            typeMap.set(subjectType, count + 1);
        });

        return Array.from(typeMap.entries()).map(([type, count]) => ({
            type,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }));
    }

    private async getClassWiseEnrollment(schemaName: string, institutionId: string): Promise<AcademicStatsResponse['classWiseEnrollment']> {
        const classes = await Class.schema(schemaName).findAll({
            where: { institution_id: institutionId, is_active: true },
            include: [{ model: Section.schema(schemaName), as: 'sections' }],
            order: [['display_order', 'ASC']],
        });

        const results: AcademicStatsResponse['classWiseEnrollment'] = [];

        for (const cls of classes) {
            const studentCount = await StudentEnrollment.schema(schemaName).count({
                where: {
                    institution_id: institutionId,
                    class_id: cls.id,
                    status: StudentEnrollmentStatus.ACTIVE,
                },
            });

            results.push({
                classId: cls.id,
                className: cls.name,
                studentCount,
                sectionCount: cls.sections?.length || 0,
            });
        }

        return results;
    }
}

export const academicStatsService = new AcademicStatsService();
