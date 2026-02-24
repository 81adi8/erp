/**
 * Dashboard Service
 * 
 * Provides aggregated statistics for the school dashboard.
 * Uses raw SQL for performance optimization on aggregation queries.
 */

import { sequelize } from '../../../../database/sequelize';
import { QueryTypes } from 'sequelize';
import { validateSchemaName } from '../../../../core/database/schema-name.util';
import { redis } from '../../../../config/redis';
import { logger } from '../../../../core/utils/logger';

const executeQuery = sequelize.query.bind(sequelize);

export interface DashboardStats {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    attendanceRate: number | null;
    studentsChange: string;
    teachersChange: string;
    recentActivity: Array<{
        icon: string;
        title: string;
        subtitle: string;
        color: string;
    }>;
}

export interface DashboardActivityResult {
    name: string;
    createdAt: string;
}

class DashboardService {
    private static readonly CACHE_TTL_SECONDS = 60;
    private static readonly DASHBOARD_TYPE_STATS = 'stats';

    private runQuery<T = unknown>(sql: string, options?: Parameters<typeof sequelize.query>[1]): Promise<T[]> {
        return executeQuery(sql, options as any) as unknown as Promise<T[]>;
    }

    private buildCacheKey(tenantId: string, dashboardType: string, date: string): string {
        return `tenant:${tenantId}:dashboard:${dashboardType}:date:${date}`;
    }

    private async getCachedStats(cacheKey: string): Promise<DashboardStats | null> {
        try {
            const cached = await redis.get(cacheKey);
            if (!cached) {
                return null;
            }
            return JSON.parse(cached) as DashboardStats;
        } catch (error) {
            logger.warn('[Dashboard] Redis read failed, falling back to DB', {
                cacheKey,
                error: error instanceof Error ? error.message : 'unknown',
            });
            return null;
        }
    }

    private async setCachedStats(cacheKey: string, value: DashboardStats): Promise<void> {
        try {
            await redis.setex(
                cacheKey,
                DashboardService.CACHE_TTL_SECONDS,
                JSON.stringify(value),
            );
        } catch (error) {
            logger.warn('[Dashboard] Redis write failed, response served from DB', {
                cacheKey,
                error: error instanceof Error ? error.message : 'unknown',
            });
        }
    }

    /**
     * Get aggregated dashboard statistics
     * 
     * @param tenantId - Tenant id (used for cache key)
     * @param schema - Tenant schema name
     * @param date - Date for attendance calculation (YYYY-MM-DD)
     * @returns Dashboard statistics
     */
    async getStats(tenantId: string, schema: string, date?: string): Promise<DashboardStats> {
        const safeSchema = validateSchemaName(schema);
        const safeTenantId = String(tenantId || '').trim() || safeSchema;
        const today = date || new Date().toISOString().split('T')[0];
        const cacheKey = this.buildCacheKey(
            safeTenantId,
            DashboardService.DASHBOARD_TYPE_STATS,
            today,
        );

        const cachedStats = await this.getCachedStats(cacheKey);
        if (cachedStats) {
            return cachedStats;
        }

        const [studentsResult, teachersResult, classesResult, attendanceResult, activityResult] =
            await Promise.allSettled([
                this.getStudentCount(safeSchema),
                this.getTeacherCount(safeSchema),
                this.getClassCount(safeSchema),
                this.getAttendanceRate(safeSchema, today),
                this.getRecentActivity(safeSchema),
            ]);

        const totalStudents = studentsResult.status === 'fulfilled'
            ? studentsResult.value : 0;
        const totalTeachers = teachersResult.status === 'fulfilled'
            ? teachersResult.value : 0;
        const totalClasses = classesResult.status === 'fulfilled'
            ? classesResult.value : 0;

        let attendanceRate: number | null = null;
        if (attendanceResult.status === 'fulfilled' && attendanceResult.value) {
            const { total, present } = attendanceResult.value;
            if (total > 0) {
                attendanceRate = Math.round((present / total) * 100);
            }
        }

        const recentActivity = activityResult.status === 'fulfilled'
            ? activityResult.value.map((r) => ({
                icon: 'ðŸ‘¤',
                title: `New student: ${r.name}`,
                subtitle: new Date(r.createdAt).toLocaleDateString(),
                color: 'bg-blue-100',
            }))
            : [];

        const stats: DashboardStats = {
            totalStudents,
            totalTeachers,
            totalClasses,
            attendanceRate,
            studentsChange: totalStudents > 0 ? `${totalStudents} enrolled` : '',
            teachersChange: totalTeachers > 0 ? `${totalTeachers} active` : '',
            recentActivity,
        };

        await this.setCachedStats(cacheKey, stats);
        return stats;
    }

    private async getStudentCount(schema: string): Promise<number> {
        const safeSchema = validateSchemaName(schema);
        const result = await this.runQuery<{ count: string }>(
            `SELECT COUNT(*) as count FROM "${safeSchema}"."students" WHERE "deletedAt" IS NULL`,
            { type: QueryTypes.SELECT }
        );
        return parseInt(result[0]?.count ?? '0', 10);
    }

    private async getTeacherCount(schema: string): Promise<number> {
        const safeSchema = validateSchemaName(schema);
        const result = await this.runQuery<{ count: string }>(
            `SELECT COUNT(*) as count FROM "${safeSchema}"."users" u
            JOIN "${safeSchema}"."user_roles" ur ON ur."userId" = u."id"
            JOIN "public"."roles" r ON r."id" = ur."roleId"
            WHERE r."name" ILIKE '%teacher%' AND u."deletedAt" IS NULL`,
            { type: QueryTypes.SELECT }
        );
        return parseInt(result[0]?.count ?? '0', 10);
    }

    private async getClassCount(schema: string): Promise<number> {
        const safeSchema = validateSchemaName(schema);
        const result = await this.runQuery<{ count: string }>(
            `SELECT COUNT(*) as count FROM "${safeSchema}"."sections" WHERE "deletedAt" IS NULL`,
            { type: QueryTypes.SELECT }
        );
        return parseInt(result[0]?.count ?? '0', 10);
    }

    private async getAttendanceRate(schema: string, today: string): Promise<{ total: number; present: number } | null> {
        const safeSchema = validateSchemaName(schema);
        const result = await this.runQuery<{ present: string; total: string }>(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'PRESENT') as present,
                COUNT(*) as total
            FROM "${safeSchema}"."student_attendances"
            WHERE DATE("date") = :today`,
            { type: QueryTypes.SELECT, replacements: { today } }
        );

        if (!result[0]) return null;

        return {
            total: parseInt(result[0].total ?? '0', 10),
            present: parseInt(result[0].present ?? '0', 10),
        };
    }

    private async getRecentActivity(schema: string): Promise<DashboardActivityResult[]> {
        const safeSchema = validateSchemaName(schema);
        return this.runQuery<DashboardActivityResult>(
            `SELECT u.first_name || ' ' || u.last_name as name, s.created_at as "createdAt"
            FROM "${safeSchema}"."students" s
            JOIN "${safeSchema}"."users" u ON u.id = s.user_id
            WHERE s.deleted_at IS NULL
            ORDER BY s.created_at DESC
            LIMIT 5`,
            { type: QueryTypes.SELECT }
        );
    }
}

export const dashboardService = new DashboardService();
export default dashboardService;
