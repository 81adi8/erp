/**
 * Health Endpoint Guard
 *
 * Protects /health, /health/ready, /health/metrics, /health/golive/*
 * Access allowed ONLY via:
 *   1. Valid INTERNAL_API_KEY header (x-internal-key)
 *   2. OR request IP in INTERNAL_IP_ALLOWLIST
 *
 * In development: allows localhost without key.
 * In production/staging: key OR allowlisted IP required.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

const isProductionLike = env.nodeEnv === 'production' || env.nodeEnv === 'staging';

// Normalize IP — strip IPv6-mapped IPv4 prefix
const normalizeIp = (ip: string | undefined): string => {
    if (!ip) return '';
    return ip.replace(/^::ffff:/, '');
};

const getRequestIp = (req: Request): string => {
    // Trust x-forwarded-for only if behind a known proxy (ALB/nginx)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const firstIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
        if (firstIp) return normalizeIp(firstIp);
    }
    return normalizeIp(req.socket?.remoteAddress ?? req.ip ?? '');
};

export const healthGuard = (req: Request, res: Response, next: NextFunction): void => {
    // ── API key check ─────────────────────────────────────────────────────────
    const providedKey = req.headers['x-internal-key'] as string | undefined;
    const configuredKey = env.health.internalApiKey;

    if (configuredKey && providedKey === configuredKey) {
        return next();
    }

    // ── IP allowlist check ────────────────────────────────────────────────────
    const allowlist: string[] = env.health.internalIpAllowlist ?? ['127.0.0.1', '::1'];
    const requestIp = getRequestIp(req);

    if (allowlist.includes(requestIp)) {
        return next();
    }

    // ── Development: allow localhost without key ──────────────────────────────
    if (!isProductionLike) {
        const localIps = ['127.0.0.1', '::1', 'localhost', ''];
        if (localIps.includes(requestIp)) {
            return next();
        }
    }

    // ── Deny ──────────────────────────────────────────────────────────────────
    res.status(403).json({
        error: 'Forbidden',
        message: 'Health endpoints require internal API key or allowlisted IP',
    });
};
