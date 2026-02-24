import { Router } from "express";
import { resolveTenantContextMiddleware } from '../../../core/middleware/resolveTenantContext.middleware';
import { verifyTenant } from "../controllers/tenant.controller";
import authRoutes from "./auth.routes";
import schoolRoutes from "../../school/routes";

const tenantRoute = Router();

// ============================================================================
// Public Routes (No tenant context required)
// ============================================================================

/**
 * @route   GET /v1/tenant/verify/:subdomain
 * @desc    Verify tenant by subdomain and return tenant info
 * @access  Public
 */
tenantRoute.get('/verify/:subdomain', verifyTenant);

// ============================================================================
// Tenant-Aware Routes (Tenant middleware applies to all routes below)
// ============================================================================

tenantRoute.use(resolveTenantContextMiddleware);

/**
 * @route   /v1/tenant/auth/*
 * @desc    Authentication routes (login, register, refresh, logout, etc.)
 * @access  Public/Protected (varies by endpoint)
 */
tenantRoute.use('/auth', authRoutes);

/**
 * @route   /v1/tenant/school/*
 * @desc    School-specific routes (classes, students, teachers, attendance, etc.)
 * @access  Protected - requires auth + tenant context
 */
tenantRoute.use('/school', schoolRoutes);

// TODO: University module deferred - not in active scope
// /**
//  * @route   /v1/tenant/university/*
//  * @desc    University-specific routes (departments, programs, courses, faculty, etc.)
//  * @access  Protected - requires auth + tenant context
//  */
// tenantRoute.use('/university', universityRoutes);

export default tenantRoute;