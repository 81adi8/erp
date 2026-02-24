import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import Institution from '../../database/models/public/Institution.model';
import { context, getContext } from '../context/requestContext';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache.keys';
import { TenantShadowTelemetry } from '../tenant/tenant-shadow.telemetry';
import { freezeTenantIdentity, TenantIdentity } from '../tenant/tenant-identity';
import { TenantContext } from '../types/api';
import { logger } from '../utils/logger';

interface CachedTenantData {
    id: string;
    name: string;
    slug: string;
    sub_domain: string;
    status: string;
    schema_name: string;
    type: string;
    plan_id?: string;
    logo_url?: string;
    primary_color?: string;
}

function extractSubdomain(hostname: string | undefined): string | null {
    if (!hostname) return null;

    const normalized = hostname.toLowerCase();
    const hostPart = normalized.startsWith('[')
        ? normalized.slice(1).split(']')[0]
        : normalized.split(':')[0];
    
    if (!hostPart) return null;
    const host = hostPart;

    if (host === 'localhost' || host === '::1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        return null;
    }

    if (host.endsWith('.localhost')) {
        const subdomain = host.replace('.localhost', '');
        return subdomain !== 'localhost' ? subdomain : null;
    }

    const parts = host.split('.');
    if (parts.length >= 3) {
        return parts[0] ?? null;
    }

    return null;
}

function extractSubdomainFromOrigin(origin: string | undefined): string | null {
    if (!origin) return null;

    try {
        const url = new URL(origin);
        return extractSubdomain(url.hostname);
    } catch {
        return null;
    }
}

function readHeaderValue(headerValue: string | string[] | undefined): string | null {
    if (!headerValue) return null;
    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function resolveTenantFromTestHeaders(req: Request): TenantContext | null {
    if (process.env.NODE_ENV !== 'test') return null;

    const schemaName = readHeaderValue(req.headers['x-schema-name'] as string | string[] | undefined);
    const tenantHeader = readHeaderValue(req.headers['x-tenant-id'] as string | string[] | undefined)
        || readHeaderValue(req.headers['x-institution-id'] as string | string[] | undefined);

    if (!schemaName || !tenantHeader) return null;

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName)) return null;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,127}$/.test(tenantHeader)) return null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const effectiveTenantId = uuidRegex.test(tenantHeader)
        ? tenantHeader
        : (process.env.TEST_TENANT_ID || '11111111-1111-4111-8111-111111111111');

    const tenant = Object.freeze({
        id: effectiveTenantId,
        slug: tenantHeader,
        db_schema: schemaName,
        status: 'active' as const,
        institutionName: tenantHeader,
        sub_domain: tenantHeader,
        type: 'school',
    });

    return tenant;
}

function createTenantInvalidError(reason: string, labels: Record<string, unknown> = {}): ApiError {
    if (reason === 'schema_missing') {
        TenantShadowTelemetry.tenantSchemaMissing(labels);
    } else {
        TenantShadowTelemetry.tenantContextMissing({ reason, ...labels });
    }
    return new ApiError(HttpStatus.FORBIDDEN, 'TENANT_INVALID');
}

/**
 * TENANT RESOLUTION & CONTEXT INJECTION MIDDLEWARE
 * 
 * This middleware combines tenant resolution and context injection into a single
 * immutable operation. Once resolved, tenant context CANNOT be modified.
 * 
 * Responsibilities:
 * 1. Extract subdomain from request
 * 2. Resolve tenant from database/cache
 * 3. Validate tenant status (active/trial/suspended)
 * 4. Attach immutable tenant context to request
 * 5. Set up async context for downstream handlers
 * 
 * SECURITY:
 * - Tenant context is IMMUTABLE after resolution (Object.freeze)
 * - No downstream middleware can modify req.tenant
 * - Schema validation prevents tenant spoofing
 */
export const resolveTenantContextMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const startTime = Date.now();
    const requestId = req.requestId || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    try {
        const route = req.originalUrl || req.url;

        const hostSubdomain = extractSubdomain(req.headers.host);
        const originSubdomain = extractSubdomainFromOrigin(req.headers.origin as string | undefined);
        const subdomain = hostSubdomain || originSubdomain;

        if (!subdomain) {
            const testTenant = resolveTenantFromTestHeaders(req);
            if (testTenant) {
                const identity = freezeTenantIdentity({
                    id: testTenant.id,
                    slug: testTenant.slug || 'tenant',
                    db_schema: testTenant.db_schema,
                    status: testTenant.status,
                });

                Object.defineProperty(req, 'tenant', {
                    value: Object.freeze({ ...testTenant }),
                    writable: false,
                    configurable: false,
                    enumerable: true,
                });
                req.tenantIdentity = identity;
                req.tenantSchema = identity.db_schema;
                req.tenantId = identity.id;

                const store = getContext();
                context.run({
                    ...store,
                    requestId,
                    tenant: identity,
                    tenantIdentity: identity,
                }, () => next());
                return;
            }

            TenantShadowTelemetry.tenantContextMissing({
                reason: 'subdomain_missing',
                route,
                method: req.method,
            });
            context.run({ requestId }, () => next());
            return;
        }

        const cacheKey = CacheKeys.TENANT_BY_SUBDOMAIN(subdomain);
        let tenantData = await CacheService.get<CachedTenantData>(cacheKey);

        if (!tenantData) {
            const tenant = await Institution.findOne({
                where: { sub_domain: subdomain, status: ['active', 'trial'] },
                attributes: ['id', 'name', 'slug', 'sub_domain', 'status', 'db_schema', 'settings', 'type', 'plan_id'],
            });

            if (!tenant) {
                TenantShadowTelemetry.tenantContextMissing({
                    reason: 'tenant_not_found',
                    route,
                    method: req.method,
                    subdomain,
                });
                context.run({ requestId }, () => next());
                return;
            }

            const settings = (tenant.get('settings') as Record<string, unknown> | null) || {};
            const status = tenant.status as 'active' | 'trial' | 'suspended';

            if (status === 'suspended') {
                return next(createTenantInvalidError('tenant_suspended', {
                    route,
                    method: req.method,
                    tenant_id: tenant.id,
                    subdomain,
                }));
            }

            if (status !== 'active' && status !== 'trial') {
                return next(createTenantInvalidError('tenant_inactive', {
                    route,
                    method: req.method,
                    tenant_id: tenant.id,
                    subdomain,
                    status,
                }));
            }

            tenantData = {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                sub_domain: tenant.sub_domain,
                status: tenant.status,
                schema_name: tenant.db_schema,
                type: tenant.type,
                plan_id: tenant.plan_id,
                logo_url: (settings['logo_url'] as string | undefined) || undefined,
                primary_color: (settings['primary_color'] as string | undefined) || undefined,
            };

            await CacheService.set(cacheKey, tenantData, CacheTTL.TENANT_BRANDING);
            await CacheService.set(CacheKeys.TENANT_BY_ID(tenantData.id), tenantData, CacheTTL.TENANT_BRANDING);
        }

        if (!tenantData.schema_name) {
            return next(createTenantInvalidError('schema_missing', {
                route,
                method: req.method,
                tenant_id: tenantData.id,
                subdomain,
            }));
        }

        const identity = freezeTenantIdentity({
            id: tenantData.id,
            slug: tenantData.slug,
            db_schema: tenantData.schema_name,
            status: tenantData.status as 'active' | 'trial' | 'suspended',
            plan_id: tenantData.plan_id,
        });

        const tenantContext: TenantContext = Object.freeze({
            ...identity,
            institutionName: tenantData.name,
            sub_domain: tenantData.sub_domain,
            type: tenantData.type,
            logo_url: tenantData.logo_url,
            primary_color: tenantData.primary_color,
        });

        Object.defineProperty(req, 'tenant', {
            value: tenantContext,
            writable: false,
            configurable: false,
            enumerable: true,
        });
        req.tenantIdentity = identity;
        req.tenantSchema = identity.db_schema;
        req.tenantId = identity.id;

        res.on('finish', () => {
            const duration = Date.now() - startTime;
            logger.debug(`[Tenant:${tenantData!.slug}] ${req.method} ${req.originalUrl} ${duration}ms`);
        });

        const store = getContext();
        context.run({
            ...store,
            requestId,
            tenant: identity,
            tenantIdentity: identity,
        }, () => next());
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Tenant resolution error:', error);
        TenantShadowTelemetry.tenantContextMissing({
            reason: 'tenant_resolution_exception',
            message,
        });
        next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error while resolving tenant'));
    }
};

export default resolveTenantContextMiddleware;
