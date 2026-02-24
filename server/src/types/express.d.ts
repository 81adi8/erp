import { TenantContext } from '../core/types/api';
import { RBACContext } from '../core/rbac/rbac.types';
import { AuthUser } from '../core/types/api';
import { Sequelize } from 'sequelize-typescript';
import { TenantIdentity } from '../core/tenant/tenant-identity';

declare global {
    namespace Express {
        interface Request {
            tenant?: TenantContext;
            tenantIdentity?: TenantIdentity;
            tenantDB?: Sequelize;
            requestId?: string;
            sessionId?: string;
            rbac?: RBACContext;
            user?: AuthUser;
            tenantSchema?: string;
            academicYearId?: string;
            tenantId?: string;
            validatedBody?: unknown;
            validatedQuery?: unknown;
            validatedParams?: unknown;
        }
    }
}

export {};
