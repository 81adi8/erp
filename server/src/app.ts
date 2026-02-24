import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import hpp from 'hpp';
import superAdminRoutes from './modules/super-admin/routes';
import { connectDB } from './database';
import { env } from './config/env';
import {
    globalErrorHandler,
    notFoundHandler,
    handleUncaughtExceptions,
    handleUnhandledRejections
} from './core/http/ErrorHandler';
import { ApiError } from './core/http/ApiError';
import tenantRoute from './modules/tenant/routes';
import schoolAuthRoutes from './modules/school/auth/auth.routes';
import { resolveTenantContextMiddleware } from './core/middleware/resolveTenantContext.middleware';
import { healthGuard } from './core/middleware/health-guard.middleware';
import { keycloakOidcMiddleware } from './core/middleware/keycloak.middleware';
import { xssSanitize, securityHeaders } from './core/middleware/security.middleware';
import { TenantIsolationGuard } from './core/resilience/tenant-isolation.guard';
import { queueManager } from './core/queue/QueueManager';
import { eventController } from './core/events/event.controller';
import { attendanceQueueService } from './modules/school/attendance/services/attendance-queue.service';

// RBAC Infrastructure - Stage 0: Shadow Mode
import { RBACCache } from './core/rbac/rbac.cache';
import { RBACResolver } from './core/rbac/rbac.resolver';
import { createRBACMiddleware } from './core/rbac/rbac.middleware';
import { getRedis } from './config/redis';

// TASK-04: Observability
import { requestIdMiddleware, httpLoggerMiddleware } from './core/observability/structured-logger';
import healthRoutes from './core/observability/health.routes';
import { logger } from './core/utils/logger';
// import queueRoutes from './modules/shared/routes/queue.routes';
import schoolRoutes from './modules/school/routes';

// TASK-05: Pilot Mode Guardrails
import { applyPilotGuardrails } from './core/middleware/pilot-mode.middleware';

// Handle uncaught exceptions (must be at the very top)
handleUncaughtExceptions();

// app.ts — Express application factory
const app = express();

// Security Middleware (enhanced)
app.use(helmet());
app.use(hpp());
app.use(compression());
app.use(cookieParser());
app.use(securityHeaders); // Custom security headers
app.use(express.json({ limit: '10kb' })); // Body limit
app.use(xssSanitize); // XSS sanitization on all requests

// TASK-04: Observability — request ID + structured HTTP logging
app.use(requestIdMiddleware);
app.use(httpLoggerMiddleware);

// Tiered Rate Limiting
// Stricter limit for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 auth requests per window
    message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// STABILIZATION: Canonical mount paths with backward-compatible aliases
const schoolAuthMounts = ['/api/v2/school/auth', '/api/v2/api/school/auth'] as const;
schoolAuthMounts.forEach((mountPath) => {
    app.use(mountPath, authLimiter);
});

// Standard API rate limit — TASK-08: Global rate limiting enabled for pilot
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 100, // 100 req/min per IP
    message: { success: false, message: 'Too many requests from this IP, please try again after 1 minute' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit per user if authenticated, else per IP
        const userId = (req as any).user?.userId;
        if (userId) return `user:${userId}`;
        const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
        return ipKeyGenerator(ip);
    },
});
app.use('/api', limiter);

// CORS Configuration
const staticAllowedOrigins = [
    'http://localhost:5173', // Local Dev
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://rk.localhost:5173',
    'http://rss.localhost:5173',
    'http://localhost:3000',
    'http://vdm.localhost:5173',
    `https://${env.domains.rootDomain}`, // Production Main
    `https://admin.${env.domains.rootDomain}`, // Admin Panel
    'https://new-erp-w0ex.onrender.com' // Backend itself (sometimes needed for same-server calls)
];

const envAllowedOrigins = env.cors.allowedOrigins
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
const allowedOrigins = [...new Set([...staticAllowedOrigins, ...envAllowedOrigins])];
const isProductionLike = env.nodeEnv === 'production' || env.nodeEnv === 'staging';

if (isProductionLike && envAllowedOrigins.includes('*')) {
    throw new Error('CORS_ORIGIN wildcard (*) is forbidden in staging/production');
}

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow localhost and loopback origins on any port for local tooling/dev-preview
        const localhostLoopbackRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
        if (localhostLoopbackRegex.test(origin)) {
            return callback(null, true);
        }

        // Check allowed exact origins
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // Check for subdomains (e.g., https://tenant.erpsaas.in)
        const rootDomain = env.domains.rootDomain;
        if (!rootDomain) {
            return callback(new Error('Root domain not configured'), false);
        }
        const escapedRootDomain = rootDomain.replace(/\./g, '\\.');
        const subdomainRegex = new RegExp(`^https://[a-z0-9-]+\\.${escapedRootDomain}$`);
        if (subdomainRegex.test(origin)) {
            return callback(null, true);
        }

        // Allow localhost subdomains for development (e.g., http://zp.localhost:5173)
        const localhostSubdomainRegex = /^http:\/\/[a-z0-9-]+\.localhost:\d+$/;
        if (localhostSubdomainRegex.test(origin)) {
            return callback(null, true);
        }

        // Allow Vercel preview deployments
        const vercelRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
        if (vercelRegex.test(origin)) {
            return callback(null, true);
        }

        // Allow Render preview deployments
        const renderRegex = /^https:\/\/[a-z0-9-]+\.onrender\.com$/;
        if (renderRegex.test(origin)) {
            return callback(null, true);
        }

        // Explicit env allowlist (never wildcard in production)
        if (envAllowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        if (!isProductionLike && envAllowedOrigins.includes('*')) {
            return callback(null, true);
        }

        return callback(ApiError.forbidden(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Accept',
        'Origin',
        'x-tenant-id', 
        'x-institution-id', 
        'x-academic-session-id', 
        'x-portal-type',
        'x-user-id',
        'x-schema-name',
        'X-Storage-Preference', 
        'X-CSRF-Token'
    ],
    exposedHeaders: ['x-academic-session-id', 'x-tenant-id']
};

app.use(cors(corsOptions));
// app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// connectDB(); // Moved to server.ts for coordinated startup

// RBAC Infrastructure is now initialized lazily in modules/school/routes/index.ts
// This avoids calling getRedis() during module load before Redis is connected

// Initialize queue and event systems
export const initializeQueueAndEventSystems = async () => {
    // Initialize queue manager
    await queueManager.initialize();
    logger.info('[App] Queue Manager initialized');

    // Initialize event controller
    await eventController.initialize();
    logger.info('[App] Event Controller initialized');

    // Initialize attendance queue service
    await attendanceQueueService.initialize();
    logger.info('[App] Attendance Queue Service initialized');

    // Initialize system queue service (maintenance/cron)
    const { systemQueueService } = await import('./modules/school/academic/services/common/system-queue.service');
    await systemQueueService.initialize();
    logger.info('[App] System Queue Service initialized');
};

// initializeQueueAndEventSystems(); // Moved to server.ts for coordinated startup

// Health check endpoint (liveness — fast)
app.get('/', (_req, res) => {
    res.send('School ERP Server Running');
});

// ── Root admin login rate limiter (brute-force protection) ───────────────────
const rootAdminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 attempts per IP per window
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only count failures
});

// STABILIZATION: Canonical root admin mount paths with backward-compatible aliases
const rootAdminMounts = ['/api/v1/root/admin', '/v1/root/admin'] as const;
rootAdminMounts.forEach((mountPath) => {
    app.use(`${mountPath}/auth/login`, rootAdminLoginLimiter);
});

// TASK-04: Full health + metrics + queue routes (protected by healthGuard)
app.use('/health', healthGuard, healthRoutes);

// TASK-05: Apply pilot mode guardrails (no-op if PILOT_MODE != true)
applyPilotGuardrails(app);

// API Routes
// STABILIZATION: Mount routes on canonical paths with backward-compatible aliases

// v2 Auth Routes - RBAC attached lazily in school/routes/index.ts
// Canonical: /api/v2/school/auth | Legacy alias: /api/v2/api/school/auth
schoolAuthMounts.forEach((mountPath) => {
    app.use(mountPath, resolveTenantContextMiddleware, schoolAuthRoutes);
});

// v2 School API Routes - Keycloak OIDC Authentication ONLY
// Canonical: /api/v2/school | Legacy alias: /api/v2/api/school
// ENTERPRISE OIDC: Backend JWT disabled - Only Keycloak allowed for school routes
const schoolV2Mounts = ['/api/v2/school', '/api/v2/api/school'] as const;
schoolV2Mounts.forEach((mountPath) => {
    app.use(
        mountPath,
        resolveTenantContextMiddleware,
        keycloakOidcMiddleware, // Only Keycloak - no authGuard fallback
        TenantIsolationGuard.middleware({ requireTenant: true }),
        schoolRoutes
    );
});

// v1 Tenant Routes - RBAC attached globally in school/routes/index.ts
// Middleware order: tenant → auth → rbac → academicSession → routes
app.use('/api/v1/tenant', tenantRoute);

// Root Admin Routes
// Canonical: /api/v1/root/admin | Legacy alias: /v1/root/admin
rootAdminMounts.forEach((mountPath) => {
    app.use(mountPath, superAdminRoutes);
});

// Queue Routes - DISABLED until proper auth hardening (see STABILIZATION PLAN Step 2)
// app.use('/api/v1/queues', queueRoutes);

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be LAST middleware
app.use(globalErrorHandler);

// Export app and a function to setup process-level handlers
export { handleUnhandledRejections };

// RBAC infrastructure is now managed in modules/school/routes/index.ts
// No longer exported from here to avoid initialization order issues

export default app;
