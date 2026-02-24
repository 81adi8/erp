/**
 * Dashboard Module — Zod Validators
 *
 * Provides route-level Zod schemas for the dashboard endpoints.
 * Currently the dashboard only has GET /stats which accepts an optional date query.
 */

import { z } from 'zod';

/** GET /dashboard/stats — Optional date query parameter */
export const DashboardStatsQuerySchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
        .optional(),
});
