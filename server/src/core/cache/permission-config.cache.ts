/**
 * Permission Config Cache
 * 
 * Loads and caches scope→permission mappings from database.
 * Refreshed on:
 *   - Server startup
 *   - Cache miss
 *   - Admin config update (via refresh endpoint)
 * 
 * NEVER queries DB per request - uses cached config only.
 */

import { CacheService } from './cache.service';
import { CacheKeys, CacheTTL } from './cache.keys';
import { Permission as PublicPermission } from '../../database/models/public/Permission.model';
import { Feature } from '../../database/models/public/Feature.model';
import { Module } from '../../database/models/public/Module.model';
import { logger } from '../utils/logger';

/**
 * Scope pattern definitions
 * Maps compact scope keys to permission patterns
 * 
 * Pattern syntax:
 *   - * = any value
 *   - :read suffix = view actions
 *   - :write suffix = create, update, delete actions
 *   - :full suffix = all actions
 */
const SCOPE_PATTERNS: Record<string, string[]> = {
    // Academic module scopes
    'academic:read': ['academic.*.view', 'academic.*.list'],
    'academic:write': ['academic.*.create', 'academic.*.update', 'academic.*.delete'],
    'academic:full': ['academic.*.*'],

    // Finance module scopes
    'finance:read': ['finance.*.view', 'finance.*.list'],
    'finance:write': ['finance.*.create', 'finance.*.update', 'finance.*.delete'],
    'finance:full': ['finance.*.*'],

    // Communication module scopes
    'communication:read': ['communication.*.view', 'communication.*.list'],
    'communication:write': ['communication.*.create', 'communication.*.update', 'communication.*.delete'],
    'communication:full': ['communication.*.*'],

    // Settings module scopes
    'settings:read': ['settings.*.view'],
    'settings:write': ['settings.*.manage'],
    'settings:full': ['settings.*.*'],

    // Admin full access
    'admin:full': ['*.*.*'],
};

interface PermissionInfo {
    id: string;
    key: string;  // e.g., "academic.students.view"
    action: string;
    featureSlug: string;
    moduleSlug: string;
}

export class PermissionConfigCache {
    private static allPermissions: PermissionInfo[] = [];
    private static scopePermissionMap: Map<string, string[]> = new Map();
    private static initialized = false;

    /**
     * Initialize cache on server startup
     * Loads all permissions and builds scope→permission map
     */
    static async initialize(): Promise<void> {
        logger.info('[PermissionConfigCache] Initializing...');
        await this.loadPermissions();
        await this.buildScopeMap();
        this.initialized = true;
        logger.info(`[PermissionConfigCache] Initialized with ${this.allPermissions.length} permissions`);
    }

    /**
     * Load all permissions from database (once on startup/refresh)
     */
    private static async loadPermissions(): Promise<void> {
        // Check cache first
        const cached = await CacheService.get<PermissionInfo[]>(CacheKeys.ALL_PERMISSIONS());
        if (cached) {
            this.allPermissions = cached;
            return;
        }

        // Load from database
        const permissions = await PublicPermission.findAll({
            where: { is_active: true },
            include: [{
                model: Feature,
                as: 'feature',
                required: true,
                include: [{
                    model: Module,
                    as: 'module',
                    required: true,
                }]
            }]
        });

        this.allPermissions = permissions.map(p => ({
            id: p.id,
            key: p.key,
            action: p.action,
            featureSlug: (p as any).feature?.slug || '',
            moduleSlug: (p as any).feature?.module?.slug || '',
        }));

        // Cache for future use
        await CacheService.set(CacheKeys.ALL_PERMISSIONS(), this.allPermissions, CacheTTL.PERMISSION_CONFIG);
    }

    /**
     * Build scope→permission map based on pattern matching
     */
    private static async buildScopeMap(): Promise<void> {
        // Check cache first
        const cached = await CacheService.get<Record<string, string[]>>(CacheKeys.SCOPE_PERMISSION_MAP());
        if (cached) {
            this.scopePermissionMap = new Map(Object.entries(cached));
            return;
        }

        // Build map from patterns
        for (const [scope, patterns] of Object.entries(SCOPE_PATTERNS)) {
            const matchedPermissions: string[] = [];

            for (const pattern of patterns) {
                const matched = this.matchPermissions(pattern);
                matchedPermissions.push(...matched);
            }

            // Deduplicate
            this.scopePermissionMap.set(scope, [...new Set(matchedPermissions)]);
        }

        // Cache the map
        const mapObject = Object.fromEntries(this.scopePermissionMap);
        await CacheService.set(CacheKeys.SCOPE_PERMISSION_MAP(), mapObject, CacheTTL.PERMISSION_CONFIG);
    }

    /**
     * Match permissions against a pattern
     * Pattern examples: "academic.*.view", "*.*.*"
     */
    private static matchPermissions(pattern: string): string[] {
        const [modulePattern, featurePattern, actionPattern] = pattern.split('.');

        return this.allPermissions
            .filter(p => {
                const [module, feature, action] = p.key.split('.');
                return (
                    (modulePattern === '*' || module === modulePattern) &&
                    (featurePattern === '*' || feature === featurePattern) &&
                    (actionPattern === '*' || action === actionPattern)
                );
            })
            .map(p => p.key);
    }

    /**
     * Expand scopes to permission keys
     * This is called from middleware - uses cached data only
     * 
     * @param scopes Array of scope keys from JWT (e.g., ["academic:read", "settings:full"])
     * @returns Array of permission keys (e.g., ["academic.students.view", "settings.roles.manage"])
     */
    static expandScopes(scopes: string[]): string[] {
        if (!this.initialized) {
            logger.warn('[PermissionConfigCache] Not initialized, returning empty permissions');
            return [];
        }

        const permissions: Set<string> = new Set();

        for (const scope of scopes) {
            const scopePermissions = this.scopePermissionMap.get(scope);
            if (scopePermissions) {
                scopePermissions.forEach(p => permissions.add(p));
            }
        }

        return [...permissions];
    }

    /**
     * Check if a permission key is granted by the given scopes
     */
    static hasPermission(scopes: string[], permissionKey: string): boolean {
        const expandedPermissions = this.expandScopes(scopes);
        return expandedPermissions.includes(permissionKey);
    }

    /**
     * Force refresh the cache (called on admin config update)
     */
    static async refresh(): Promise<void> {
        logger.info('[PermissionConfigCache] Refreshing...');

        // Clear cached data
        await CacheService.del(CacheKeys.ALL_PERMISSIONS());
        await CacheService.del(CacheKeys.SCOPE_PERMISSION_MAP());

        // Re-initialize
        this.allPermissions = [];
        this.scopePermissionMap.clear();
        this.initialized = false;

        await this.initialize();
    }

    /**
     * Get all available scopes (for admin UI)
     */
    static getAvailableScopes(): string[] {
        return Object.keys(SCOPE_PATTERNS);
    }

    /**
     * Get all permission keys (for debugging)
     */
    static getAllPermissionKeys(): string[] {
        return this.allPermissions.map(p => p.key);
    }
}

export default PermissionConfigCache;
