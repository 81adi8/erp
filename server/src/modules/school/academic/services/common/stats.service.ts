import { Class } from '../../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../../database/models/school/academics/class/Section.model';
import { Subject } from '../../../../../database/models/school/academics/curriculum/Subject.model';
import { Chapter } from '../../../../../database/models/school/academics/curriculum/Chapter.model';
import { Topic } from '../../../../../database/models/school/academics/curriculum/Topic.model';
import { LessonPlan } from '../../../../../database/models/school/academics/curriculum/LessonPlan.model';
import { AcademicSession } from '../../../../../database/models/school/academics/session/AcademicSession.model';
import { StudentEnrollment, StudentEnrollmentStatus } from '../../../../../database/models/school/academics/student/StudentEnrollment.model';
import { ClassSubject } from '../../../../../database/models/school/academics/curriculum/ClassSubject.model';

// Lesson Plan Status constants
const LESSON_PLAN_STATUS = {
    PLANNED: 'PLANNED',
    ONGOING: 'ONGOING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export interface AcademicStats {
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
        completionRate: number;
    };
    subjectDistribution: Array<{
        type: string;
        count: number;
        percentage: number;
    }>;
    classWiseData: Array<{
        classId: string;
        className: string;
        studentCount: number;
        sectionCount: number;
    }>;
}

export class StatsService {
    /**
     * Get comprehensive academic statistics for dashboard
     */
    async getAcademicStats(schemaName: string, institutionId: string): Promise<AcademicStats> {
        const [
            classes,
            sections,
            subjects,
            chapters,
            topics,
            classSubjectMappings,
            currentSession,
            lessonPlanStats,
            subjectDistribution,
            classWiseData,
        ] = await Promise.all([
            Class.schema(schemaName).count({ where: { institution_id: institutionId, is_active: true } }),
            Section.schema(schemaName).count({ where: { institution_id: institutionId, is_active: true } }),
            Subject.schema(schemaName).count({ where: { institution_id: institutionId, is_active: true } }),
            this.getChapterCount(schemaName, institutionId),
            this.getTopicCount(schemaName, institutionId),
            ClassSubject.schema(schemaName).count({ where: { institution_id: institutionId } }),
            this.getCurrentSessionInfo(schemaName, institutionId),
            this.getLessonPlanStats(schemaName, institutionId),
            this.getSubjectDistribution(schemaName, institutionId),
            this.getClassWiseData(schemaName, institutionId),
        ]);

        const totalEnrollments = classWiseData.reduce((sum, c) => sum + c.studentCount, 0);

        return {
            classes,
            sections,
            subjects,
            chapters,
            topics,
            totalEnrollments,
            classSubjectMappings,
            currentSession,
            lessonPlans: lessonPlanStats,
            subjectDistribution,
            classWiseData,
        };
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

    private async getCurrentSessionInfo(schemaName: string, institutionId: string): Promise<AcademicStats['currentSession']> {
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
            startDate: String(session.start_date),
            endDate: String(session.end_date),
            daysRemaining,
            progressPercent,
        };
    }

    private async getLessonPlanStats(schemaName: string, institutionId: string): Promise<AcademicStats['lessonPlans']> {
        const plans = await LessonPlan.schema(schemaName).findAll({
            where: { institution_id: institutionId },
            attributes: ['status'],
        });

        const total = plans.length;
        const planned = plans.filter(p => p.status === LESSON_PLAN_STATUS.PLANNED).length;
        const ongoing = plans.filter(p => p.status === LESSON_PLAN_STATUS.ONGOING).length;
        const completed = plans.filter(p => p.status === LESSON_PLAN_STATUS.COMPLETED).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, planned, ongoing, completed, completionRate };
    }

    private async getSubjectDistribution(schemaName: string, institutionId: string): Promise<AcademicStats['subjectDistribution']> {
        const subjects = await Subject.schema(schemaName).findAll({
            where: { institution_id: institutionId, is_active: true },
            attributes: ['subject_type'],
        });

        const total = subjects.length;
        const typeMap = new Map<string, number>();

        subjects.forEach(s => {
            const type = s.subject_type || 'UNKNOWN';
            const count = typeMap.get(type) || 0;
            typeMap.set(type, count + 1);
        });

        return Array.from(typeMap.entries()).map(([type, count]) => ({
            type,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }));
    }

    private async getClassWiseData(schemaName: string, institutionId: string): Promise<AcademicStats['classWiseData']> {
        const classes = await Class.schema(schemaName).findAll({
            where: { institution_id: institutionId, is_active: true },
            include: [{ model: Section.schema(schemaName), as: 'sections' }],
            order: [['display_order', 'ASC']],
        });

        const results: AcademicStats['classWiseData'] = [];

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

export const statsService = new StatsService();
