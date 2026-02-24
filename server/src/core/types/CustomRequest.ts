import { Request } from 'express';
import { TenantContext, AuthUser } from './api';

export interface CustomRequest extends Request {
    user?: AuthUser;
    institutionId?: string;
    tenant?: TenantContext;
}
