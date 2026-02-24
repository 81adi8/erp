import type { Request } from 'express';
import { jwtUtil } from '../auth/jwt';
import { TokenService } from '../../modules/auth/token.service';

export interface JwtTenantBridgePayload {
    tenantId?: string;
    institutionId?: string;
    sessionId?: string;
}

export interface JwtTenantBridgeResult {
    payload?: JwtTenantBridgePayload;
    source: 'modules_auth_token_service' | 'core_jwt_util' | 'none';
    tokenPresent: boolean;
}

const normalize = (value?: string | null): string | undefined => {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const pickTokenFromRequest = (req: Request): string | undefined => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return normalize(authHeader.slice(7));
    }

    const requestAny = req as any;
    const cookieAccess = normalize(requestAny?.cookies?.access_token);
    if (cookieAccess) {
        return cookieAccess;
    }

    const cookieLegacy = normalize(requestAny?.cookies?.auth_token);
    if (cookieLegacy) {
        return cookieLegacy;
    }

    return undefined;
};

const mapPayload = (payload?: any): JwtTenantBridgePayload | undefined => {
    if (!payload) return undefined;

    return {
        tenantId: normalize(payload.tenantId),
        institutionId: normalize(payload.institutionId),
        sessionId: normalize(payload.sessionId),
    };
};

export const decodeJwtTenantClaims = (req: Request): JwtTenantBridgeResult => {
    const token = pickTokenFromRequest(req);

    if (!token) {
        return {
            source: 'none',
            tokenPresent: false,
        };
    }

    const modulesPayload = mapPayload(TokenService.decodeToken(token));
    if (modulesPayload) {
        return {
            payload: modulesPayload,
            source: 'modules_auth_token_service',
            tokenPresent: true,
        };
    }

    const legacyPayload = mapPayload(jwtUtil.decode(token));
    if (legacyPayload) {
        return {
            payload: legacyPayload,
            source: 'core_jwt_util',
            tokenPresent: true,
        };
    }

    return {
        source: 'none',
        tokenPresent: true,
    };
};
