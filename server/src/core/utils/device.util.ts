import { Request } from 'express';
import crypto from 'crypto';
import type { DeviceInfo } from '../../modules/auth/auth.types';

// ============================================================================
// Device Information Extraction
// ============================================================================

/**
 * Extract device information from an HTTP request
 * Handles proxied requests and parses user-agent for device details
 */
export function extractDeviceInfo(req: Request): DeviceInfo {
    // Extract IP address (handle proxies)
    const ip = getClientIp(req);

    // Extract User-Agent
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Extract device fingerprint if provided by client
    const fingerprint = req.headers['x-device-fingerprint'] as string | undefined;
    const deviceId = req.headers['x-device-id'] as string | undefined;

    // Parse user-agent for browser/OS info
    const parsed = parseUserAgent(userAgent);

    return {
        ip,
        userAgent,
        deviceId,
        fingerprint,
        ...parsed,
    };
}

/**
 * Get client IP address, handling common proxy headers
 */
export function getClientIp(req: Request): string {
    // Check common proxy headers
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // X-Forwarded-For can be comma-separated list, take first (actual client)
        const ips = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor.split(',')[0];
        if (ips) return ips.trim();
    }

    // Other proxy headers
    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) {
        return realIp;
    }

    // Cloudflare
    const cfIp = req.headers['cf-connecting-ip'] as string;
    if (cfIp) {
        return cfIp;
    }

    // Fallback to connection remote address
    return req.socket?.remoteAddress ?? req.ip ?? '0.0.0.0';
}

/**
 * Parse user-agent string to extract browser, OS, and device type
 */
export function parseUserAgent(userAgent: string): Pick<DeviceInfo, 'browser' | 'os' | 'deviceType'> {
    const ua = userAgent.toLowerCase();

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
    else if (ua.includes('msie') || ua.includes('trident')) browser = 'IE';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
    else if (ua.includes('linux') && !ua.includes('android')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    // Detect device type
    let deviceType: DeviceInfo['deviceType'] = 'unknown';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceType = 'mobile';
    } else if (ua.includes('ipad') || ua.includes('tablet')) {
        deviceType = 'tablet';
    } else if (ua.includes('windows') || ua.includes('mac os') || ua.includes('linux')) {
        deviceType = 'desktop';
    }

    return { browser, os, deviceType };
}

/**
 * Generate a unique device identifier from device info
 * Used when client doesn't provide a device ID
 */
export function generateDeviceId(deviceInfo: DeviceInfo): string {
    const data = [
        deviceInfo.ip,
        deviceInfo.userAgent,
        deviceInfo.fingerprint || '',
    ].join('|');

    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Create a session fingerprint for additional security validation
 */
export function createSessionFingerprint(deviceInfo: DeviceInfo): string {
    // Use stable device attributes that shouldn't change during session
    const data = [
        deviceInfo.browser || '',
        deviceInfo.os || '',
        deviceInfo.deviceType || '',
        deviceInfo.fingerprint || '',
    ].join('|');

    return crypto.createHash('sha256').update(data).digest('hex');
}
