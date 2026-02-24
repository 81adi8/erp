// Core Routes - Auth and Error with tenant-aware routing
import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '../config/constants';
import { lazy } from 'react';
import {
    LoginPageRouter,
    RegisterPageRouter,
    ForgotPasswordPageRouter,
    OTPPageRouter,
    ResetPasswordPageRouter,
} from './TenantAuthRouter';

// Error pages
const NotFoundPage = lazy(() => import('./error/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./error/UnauthorizedPage'));

// Auth routes - Uses TenantAuthRouter for conditional loading
// School tenant → School auth pages
// Other tenants → Default/Common auth pages
export const authRoutes: RouteObject[] = [
    { path: ROUTES.LOGIN, element: <LoginPageRouter /> },
    { path: ROUTES.REGISTER, element: <RegisterPageRouter /> },
    { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPageRouter /> },
    { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordPageRouter /> },
    { path: '/verify-otp', element: <OTPPageRouter /> },
];

// Error routes (shared across all tenant types)
export const errorRoutes: RouteObject[] = [
    { path: '/unauthorized', element: <UnauthorizedPage /> },
    { path: '*', element: <NotFoundPage /> },
];

// Export all core routes
export const coreRoutes = [...authRoutes, ...errorRoutes];
