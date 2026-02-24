
import { AsyncLocalStorage } from 'async_hooks';
import type { TenantContext } from '../../modules/tenant/types/tenant.types';
import type { TenantIdentity } from '../tenant/tenant-identity';
import { ApiError } from '../http/ApiError';
import { TenantShadowTelemetry } from '../tenant/tenant-shadow.telemetry';

export interface RequestActor {
    userId?: string;
    roles?: string[];
}

export interface RequestContext {
    tenant?: TenantContext;
    tenantIdentity?: TenantIdentity;
    requestId?: string;
    actor?: RequestActor;
}

export const context = new AsyncLocalStorage<RequestContext>();

export const getContext = () => context.getStore();
export const getTenant = () => context.getStore()?.tenant;
export const getTenantIdentity = () => context.getStore()?.tenantIdentity;
export const getRequestId = () => context.getStore()?.requestId;
export const getActor = () => context.getStore()?.actor;

export const setActor = (actor?: RequestActor): void => {
    const store = context.getStore();
    if (!store) return;
    store.actor = actor;
};

export const requireTenantIdentity = (): TenantIdentity => {
    const tenant = getContext()?.tenant;

    if (!tenant) {
        TenantShadowTelemetry.tenantContextMissing({
            source: 'request_context',
        });
        throw ApiError.internal('TENANT_CONTEXT_MISSING');
    }

    if (!tenant.id || !tenant.db_schema || !tenant.slug || !tenant.status) {
        TenantShadowTelemetry.tenantContextMissing({
            source: 'request_context',
            reason: 'incomplete_tenant_identity',
            tenant_present: true,
        });
        throw ApiError.internal('TENANT_CONTEXT_MISSING');
    }

    return tenant;
};
