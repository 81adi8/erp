import { NextFunction, Request, Response, Router } from 'express';
import { academicSessionMiddleware } from '../../../core/middleware/academicSession.middleware';
import { createRBACMiddleware } from '../../../core/rbac/rbac.middleware';
import { RBACCache } from '../../../core/rbac/rbac.cache';
import { RBACResolver } from '../../../core/rbac/rbac.resolver';
import { getRedis } from '../../../config/redis';
import rbacRoutes from './rbac.routes';
import userManagementRoutes from '../user-management/routes/user-management.routes';
import navigationRoutes from './navigation.routes';
import { academicRoutes } from '../academic';

/**
 * School-specific routes
 * 
 * ENTERPRISE OIDC MODE:
 * - Authentication is handled at app.ts level via keycloakOidcMiddleware
 * - RBAC is resolved at runtime via lazyRBACMiddleware
 * - NO authGuard - backend JWT disabled for school routes
 * 
 * Middleware chain (app.ts):
 * tenantMiddleware → tenantContextShadow → keycloakOidcMiddleware → TenantIsolationGuard → schoolRoutes
 * 
 * Inside schoolRoutes:
 * lazyRBACMiddleware → academicSessionMiddleware → route handlers
 */
const router = Router();

// ============================================================================
// RBAC Middleware - Lazy initialization for Redis connectivity
// ============================================================================
// Stage 0: RBAC Shadow Mode - attaches req.rbac without blocking
// Order: tenant → auth → rbac → routes
// Lazy initialization: Redis might not be connected yet during module load
let rbacCache: RBACCache | null = null;
let rbacResolver: RBACResolver | null = null;
let attachRBACContext: ReturnType<typeof createRBACMiddleware> | null = null;

// Middleware that initializes RBAC lazily on first request
const lazyRBACMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!attachRBACContext) {
        rbacCache = new RBACCache(getRedis());
        rbacResolver = new RBACResolver(rbacCache);
        attachRBACContext = createRBACMiddleware({ resolver: rbacResolver });
    }
    return attachRBACContext(req, res, next);
};

router.use(lazyRBACMiddleware);

// Extract academic session context from X-Academic-Session-ID header
router.use(academicSessionMiddleware);

// ============================================================================
// Navigation & Permissions (for sidebar/menu building)
// ============================================================================
router.use('/navigation', navigationRoutes);

// ============================================================================
// Role & Permission Management (RBAC)
// ============================================================================
router.use(rbacRoutes);

// ============================================================================
// User Management (Teachers, Students, Staff, Parents)
// ============================================================================
router.use(userManagementRoutes);

// ============================================================================
// Academic Management (Academic Years, Classes, Sections, Subjects)
// ============================================================================
router.use('/academics', academicRoutes);

// ============================================================================
// Student Management (Admission, Profiles, Enrollments)
// ============================================================================
import studentRoutes from '../student/routes/student.routes';
router.use('/students', studentRoutes);

// ============================================================================
// Attendance Management (RBAC Pilot)
// ============================================================================
import { attendanceRoutes } from '../attendance';
router.use('/attendance', attendanceRoutes);

// ============================================================================
// Timetable Routes (Placeholder)
// ============================================================================
router.use('/timetable', (_req, res) => res.json({
    success: true,
    message: 'Timetable API',
    data: null,
    errors: [],
}));

// ============================================================================
// Exam & Results Routes (RBAC Pilot)
// ============================================================================
import examinationRoutes from '../examination/routes/examination.routes';
router.use('/exams', examinationRoutes);
router.use('/examinations', examinationRoutes);

// ============================================================================
// Dashboard Stats (aggregated metrics for school dashboard)
// ============================================================================
import dashboardRoutes from '../dashboard/routes/dashboard.routes';
router.use('/dashboard', dashboardRoutes);

// ============================================================================
// Fee Management (categories, structures, payments, receipts)
// ============================================================================
import feesRoutes from '../fees/routes/fees.routes';
router.use('/fees', feesRoutes);

// ============================================================================
// Notices / Announcements
// ============================================================================
import noticesRoutes from '../communication/routes/notices.routes';
router.use('/notices', noticesRoutes);

// ============================================================================
// Parent Portal
// ============================================================================
import parentPortalRoutes from '../communication/routes/parent-portal.routes';
router.use('/parent-portal', parentPortalRoutes);

// ============================================================================
// Reports Module (Async report generation with queue integration)
// ============================================================================
import reportsRoutes, { registerReportsWorker } from '../reports/routes/reports.routes';
router.use('/reports', reportsRoutes);

// Register reports queue worker (idempotent - safe to call multiple times)
registerReportsWorker();

export default router;
