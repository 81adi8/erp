// AppRouter - Main router with dynamic tenant module loading
import { Suspense, useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Route, Navigate, createRoutesFromElements, Outlet } from 'react-router-dom';
import { TenantGuard, AuthGuard, GuestGuard } from './guards';
import { authRoutes, errorRoutes } from './routes';
import { ROUTES } from '../config/constants';
import { AuthLayout } from '../../layouts';
import { useTenant } from '../tenant';
import { loadTenantModule } from '../utils/moduleLoader';
import { LoadingFallback } from '../utils/moduleLoader';
import { ModuleErrorBoundary } from '../utils/errorBoundary';
import GlobalErrorHandler from '../errors/GlobalErrorHandler';
import type { TenantModule, TenantType } from '../config/tenantModuleConfig';
import { AdminLoginPageRouter } from './TenantAuthRouter';

// Loading component for lazy loaded pages
function PageLoadingFallback() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading...</p>
            </div>
        </div>
    );
}

// Dynamic Tenant Module Router
function TenantModuleContent() {
    const { tenant, isValidTenant } = useTenant();
    const [module, setModule] = useState<TenantModule | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function loadModule() {
            if (!tenant?.type) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const loadedModule = await loadTenantModule(tenant.type as TenantType);
                if (loadedModule) {
                    setModule(loadedModule);
                } else {
                    setError(new Error(`Module not found for: ${tenant.type}`));
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                setIsLoading(false);
            }
        }

        if (isValidTenant && tenant) {
            loadModule();
        }
    }, [tenant, isValidTenant]);

    if (isLoading) {
        return <LoadingFallback message="Loading application..." />;
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Module Error</h1>
                    <p className="text-muted-foreground mb-4">{error.message}</p>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!isValidTenant || !tenant) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Tenant</h1>
                    <p className="text-muted-foreground">Please access via a valid subdomain.</p>
                </div>
            </div>
        );
    }

    if (module) {
        const ModuleRoutes = module.routes;
        return (
            <ModuleErrorBoundary moduleName={module.config.name}>
                <Suspense fallback={<LoadingFallback message="Loading page..." />}>
                    <ModuleRoutes />
                </Suspense>
            </ModuleErrorBoundary>
        );
    }

    return <LoadingFallback message="Initializing..." />;
}

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route
            element={
                <GlobalErrorHandler>
                    <TenantGuard>
                        <Suspense fallback={<PageLoadingFallback />}>
                            <Outlet />
                        </Suspense>
                    </TenantGuard>
                </GlobalErrorHandler>
            }
        >
            {/* Root redirect */}
            <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

            {/* Guest Admin Login - matches /admin exactly for school guests */}
            <Route
                path="/admin"
                element={
                    <GuestGuard redirectTo="/admin/dashboard">
                        <AuthLayout>
                            <AdminLoginPageRouter />
                        </AuthLayout>
                    </GuestGuard>
                }
            />

            {/* Auth routes - guest only, shared across all tenant types */}
            {authRoutes.map((route) => (
                <Route
                    key={route.path}
                    path={route.path}
                    element={
                        <GuestGuard>
                            <AuthLayout>{route.element}</AuthLayout>
                        </GuestGuard>
                    }
                />
            ))}

            {/* Protected routes - dynamically load tenant module (handles /admin/dashboard, /student, etc.) */}
            <Route
                path="/*"
                element={
                    <AuthGuard>
                        <TenantModuleContent />
                    </AuthGuard>
                }
            />

            {/* Error routes */}
            {errorRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
            ))}
        </Route>
    )
);

/**
 * AppRouter - Main router with tenant-based dynamic module loading
 */
export function AppRouter() {
    return <RouterProvider router={router} />;
}

export default AppRouter;
