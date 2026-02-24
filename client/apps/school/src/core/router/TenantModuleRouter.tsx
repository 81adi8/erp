// Tenant Module Router - Dynamically loads tenant-specific routes
import { Suspense, useState, useEffect, type ReactNode } from 'react';
import { useTenant } from '../tenant';
import { loadTenantModule } from '../utils/moduleLoader';
import { LoadingFallback, ErrorFallback } from '../utils/moduleLoader';
import type { TenantModule, TenantType } from '../config/tenantModuleConfig';

interface TenantModuleRouterProps {
    fallback?: ReactNode;
}

export function TenantModuleRouter({ fallback }: TenantModuleRouterProps) {
    const { tenant, isLoading: isTenantLoading, isValidTenant } = useTenant();
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
                    setError(new Error(`Failed to load module for tenant type: ${tenant.type}`));
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error loading module'));
            } finally {
                setIsLoading(false);
            }
        }

        if (isValidTenant && tenant) {
            loadModule();
        }
    }, [tenant, isValidTenant]);

    // Show loading while tenant is being resolved
    if (isTenantLoading) {
        return fallback ? <>{fallback}</> : <LoadingFallback message="Resolving tenant..." />;
    }

    // Show loading while module is being loaded
    if (isLoading) {
        return fallback ? <>{fallback}</> : <LoadingFallback message="Loading application..." />;
    }

    // Show error if module failed to load
    if (error) {
        return <ErrorFallback error={error} resetError={() => window.location.reload()} />;
    }

    // Show error if no valid tenant
    if (!isValidTenant || !tenant) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Tenant</h1>
                    <p className="text-muted-foreground">Please access via a valid subdomain.</p>
                </div>
            </div>
        );
    }

    // Render the loaded module routes
    if (module) {
        const ModuleRoutes = module.routes;
        return (
            <Suspense fallback={<LoadingFallback message="Loading page..." />}>
                <ModuleRoutes />
            </Suspense>
        );
    }

    return <LoadingFallback message="Initializing..." />;
}

export default TenantModuleRouter;
