// Tenant-Aware Auth Router
// Conditionally loads school-specific auth or default auth based on tenant type
import { lazy, Suspense } from 'react';
import { useTenant } from '../tenant';
import { LoadingSpinner } from '@erp/common';

// Default/Common auth pages (for non-school tenants)
const DefaultLoginPage = lazy(() => import('./auth/LoginPage'));
const DefaultRegisterPage = lazy(() => import('./auth/RegisterPage'));
const DefaultForgotPasswordPage = lazy(() => import('./auth/ForgotPasswordPage'));
const DefaultOTPPage = lazy(() => import('./auth/OTPVerificationPage'));
const DefaultResetPasswordPage = lazy(() => import('./auth/ResetPasswordPage'));

// School-specific auth pages
const SchoolLoginPage = lazy(() => import('@/tenant-modules/school/auth/SchoolLoginPage').then(m => ({ default: m.SchoolLoginPage })));
const SchoolAdminLoginPage = lazy(() => import('@/tenant-modules/school/auth/SchoolAdminLoginPage').then(m => ({ default: m.SchoolAdminLoginPage })));
const SchoolRegisterPage = lazy(() => import('@/tenant-modules/school/auth/SchoolRegisterPage').then(m => ({ default: m.SchoolRegisterPage })));
const SchoolForgotPasswordPage = lazy(() => import('@/tenant-modules/school/auth/SchoolForgotPasswordPage').then(m => ({ default: m.SchoolForgotPasswordPage })));
const SchoolResetPasswordPage = lazy(() => import('@/tenant-modules/school/auth/SchoolResetPasswordPage').then(m => ({ default: m.SchoolResetPasswordPage })));
const SchoolOTPPage = lazy(() => import('@/tenant-modules/school/auth/SchoolOTPPage').then(m => ({ default: m.SchoolOTPPage })));

interface TenantAuthRouterProps {
    page: 'login' | 'admin-login' | 'register' | 'forgot-password' | 'otp' | 'reset-password';
}

function AuthLoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <LoadingSpinner size="lg" />
        </div>
    );
}

export function TenantAuthRouter({ page }: TenantAuthRouterProps) {
    const { tenant, isLoading: isTenantLoading } = useTenant();

    if (isTenantLoading) {
        return <AuthLoadingFallback />;
    }

    const isSchool = tenant?.type === 'school';

    // Render appropriate auth component based on tenant type
    const getAuthPage = () => {
        switch (page) {
            case 'login':
                return isSchool ? <SchoolLoginPage /> : <DefaultLoginPage />;
            case 'admin-login':
                return isSchool ? <SchoolAdminLoginPage /> : <DefaultLoginPage />;
            case 'register':
                return isSchool ? <SchoolRegisterPage /> : <DefaultRegisterPage />;
            case 'forgot-password':
                return isSchool ? <SchoolForgotPasswordPage /> : <DefaultForgotPasswordPage />;
            case 'otp':
                return isSchool ? <SchoolOTPPage /> : <DefaultOTPPage />;
            case 'reset-password':
                return isSchool ? <SchoolResetPasswordPage /> : <DefaultResetPasswordPage />;
            default:
                return <DefaultLoginPage />;
        }
    };

    return (
        <Suspense fallback={<AuthLoadingFallback />}>
            {getAuthPage()}
        </Suspense>
    );
}

// Individual page components for route usage
export function LoginPageRouter() {
    return <TenantAuthRouter page="login" />;
}

export function RegisterPageRouter() {
    return <TenantAuthRouter page="register" />;
}

export function ForgotPasswordPageRouter() {
    return <TenantAuthRouter page="forgot-password" />;
}

export function OTPPageRouter() {
    return <TenantAuthRouter page="otp" />;
}

export function ResetPasswordPageRouter() {
    return <TenantAuthRouter page="reset-password" />;
}

export function AdminLoginPageRouter() {
    return <TenantAuthRouter page="admin-login" />;
}
