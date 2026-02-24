import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import { env } from '../../config/env';
import KEYCLOAK_CONFIG from '../../config/keycloak.config';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';

export interface KeycloakTokenPayload {
    sub: string;
    email?: string;
    preferred_username?: string;
    given_name?: string;
    family_name?: string;
    email_verified?: boolean;
    realm_access?: {
        roles: string[];
    };
    resource_access?: {
        [key: string]: {
            roles: string[];
        };
    };
    iss?: string;
}

// CQ-01 FIX: Typed interfaces for user creation to replace `any`
export interface CreateKeycloakUserData {
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
}

export interface KeycloakUserPayload {
    realm: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    credentials: Array<{
        type: string;
        value: string;
        temporary: boolean;
    }>;
    enabled?: boolean;
    emailVerified?: boolean;
}

export class KeycloakService {
    private static readonly KEYCLOAK_URL = KEYCLOAK_CONFIG.url;
    private static readonly DEFAULT_REALM = KEYCLOAK_CONFIG.realm;
    private static readonly CLIENT_ID = KEYCLOAK_CONFIG.clientId;

    private static jwksClients: Map<string, jwksClient.JwksClient> = new Map();
    private static adminClient: KcAdminClient | null = null;

    /**
     * Get or create a JWKS client for a specific realm
     */
    private static getJwksClient(realm: string): jwksClient.JwksClient {
        if (!this.jwksClients.has(realm)) {
            const client = jwksClient({
                jwksUri: KEYCLOAK_CONFIG.getEndpoints(realm).jwks,
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 10
            });
            this.jwksClients.set(realm, client);
        }
        return this.jwksClients.get(realm)!;
    }

    /**
     * Initialize and get the Keycloak Admin Client with auto-reauth logic
     */
    private static async getAdminClient(): Promise<KcAdminClient> {
        if (!this.adminClient) {
            this.adminClient = new KcAdminClient({
                baseUrl: this.KEYCLOAK_URL,
                realmName: 'master',
            });
        }

        try {
            // Check if we are already authenticated by trying to get server info or similar
            // Alternatively, just always auth if we want to be safe, but that's expensive.
            // Better: auth if no token or if it's about to expire.
            // The admin client has internal state for this, but let's be explicit if we hit 401.

            await this.authenticateAdmin();
        } catch (error) {
            logger.error('[KeycloakService] Admin authentication failed:', error);
            throw new AppError('Keycloak Admin Authentication failed', 401);
        }

        return this.adminClient;
    }

    /**
     * Direct authentication for the admin client
     */
    private static async authenticateAdmin(): Promise<void> {
        if (!this.adminClient) return;

        try {
            await this.adminClient.auth({
                grantType: 'password',
                username: KEYCLOAK_CONFIG.admin.username,
                password: KEYCLOAK_CONFIG.admin.password,
                clientId: KEYCLOAK_CONFIG.admin.clientId || 'admin-cli',
            });

            logger.info('[KeycloakService] Admin authenticated successfully');
        } catch (error: any) {
            logger.error('[KeycloakService] Failed to authenticate admin:', error.message);
            throw error;
        }
    }


    /**
     * Get the public key for a given token header and realm
     */
    private static async getSigningKey(header: jwt.JwtHeader, realm: string): Promise<string> {
        const client = this.getJwksClient(realm);
        return new Promise((resolve, reject) => {
            if (!header.kid) {
                return reject(new Error('Token header missing kid'));
            }
            client.getSigningKey(header.kid, (err, key) => {
                if (err) return reject(err);
                const signingKey = key?.getPublicKey();
                if (!signingKey) return reject(new Error('Could not find public key for kid'));
                resolve(signingKey);
            });
        });
    }

    /**
     * Validate a Keycloak Access Token
     * supports dynamic realm detection from token issuer if realm is not provided.
     */
    static async verifyToken(token: string, realm?: string): Promise<KeycloakTokenPayload> {
        try {
            // 1. Decode token to get header and payload
            const decodedToken = jwt.decode(token, { complete: true });
            if (!decodedToken || typeof decodedToken === 'string') {
                throw new AppError('Invalid token format', 401);
            }

            const payload = decodedToken.payload as KeycloakTokenPayload;

            // 2. Detect realm from issuer if not provided
            let effectiveRealm = realm;
            if (!effectiveRealm && payload.iss) {
                const parts = payload.iss.split('/');
                effectiveRealm = parts[parts.length - 1];
            }
            effectiveRealm = effectiveRealm || this.DEFAULT_REALM;

            // 3. Get signing key from Keycloak JWKS
            const signingKey = await this.getSigningKey(decodedToken.header, effectiveRealm);

            // 4. Verify token signature and claims
            const verified = jwt.verify(token, signingKey, {
                algorithms: ['RS256'],
                issuer: `${this.KEYCLOAK_URL}/realms/${effectiveRealm}`
            }) as KeycloakTokenPayload;

            return verified;
        } catch (error: any) {
            logger.error('[KeycloakService] Token verification failed:', error.message);
            throw new AppError(`Unauthorized: ${error.message}`, 401);
        }
    }

    /**
     * Extract roles from Keycloak token
     */
    static getRoles(payload: KeycloakTokenPayload): string[] {
        const realmRoles = payload.realm_access?.roles || [];
        const clientRoles = payload.resource_access?.[this.CLIENT_ID]?.roles || [];
        return [...new Set([...realmRoles, ...clientRoles])];
    }

    /**
     * Map Keycloak roles to application portals
     */
    static mapToAppRole(roles: string[]): string {
        if (roles.includes('admin')) return 'admin';
        if (roles.includes('teacher')) return 'teacher';
        if (roles.includes('student')) return 'student';
        if (roles.includes('staff')) return 'staff';
        return 'user';
    }

    /**
     * Admin: Create a new realm
     */
    static async createRealm(realmName: string, displayName?: string) {
        const adminClient = await this.getAdminClient();
        logger.info(`[KeycloakService] Creating realm: ${realmName}`);

        try {
            await adminClient.realms.create({
                realm: realmName,
                displayName: displayName || realmName,
                ...KEYCLOAK_CONFIG.realmDefaults
            });
            logger.info(`[KeycloakService] Realm ${realmName} created with centralized defaults.`);
        } catch (err: any) {
            if (err.response?.status === 409) {
                logger.warn(`[KeycloakService] Realm ${realmName} already exists`);
            } else {
                throw err;
            }
        }

        // 2. Clear ANY default required actions at the realm level to prevent "Account not set up" errors
        try {
            const authMgmt = adminClient.authenticationManagement as any;

            // Use centralized standard required action aliases
            for (const alias of KEYCLOAK_CONFIG.requiredActionAliases) {
                try {
                    await authMgmt.updateRequiredAction(
                        { realm: realmName, alias },
                        { alias, defaultAction: false, enabled: false }
                    );
                    logger.info(`[KeycloakService] Explicitly disabled action: ${alias} for realm: ${realmName}`);
                } catch (e) {
                    // Ignore if action doesn't exist
                }
            }

            // Also try the discovery method for any custom actions
            const discoveredActions = await authMgmt.getRequiredActions({ realm: realmName }).catch(() => []);
            for (const action of discoveredActions) {
                if (action.defaultAction || action.enabled) {
                    await authMgmt.updateRequiredAction(
                        { realm: realmName, alias: action.alias! },
                        { ...action, defaultAction: false, enabled: false }
                    ).catch(() => { });
                }
            }
        } catch (err: any) {
            logger.warn(`[KeycloakService] Could not fully clear required actions for ${realmName}: ${err.message}`);
        }

        // 3. Final Realm Update for critical flags
        await adminClient.realms.update({ realm: realmName }, {
            registrationEmailAsUsername: KEYCLOAK_CONFIG.realmDefaults.registrationEmailAsUsername,
            duplicateEmailsAllowed: KEYCLOAK_CONFIG.realmDefaults.duplicateEmailsAllowed,
            verifyEmail: KEYCLOAK_CONFIG.realmDefaults.verifyEmail,
            loginWithEmailAllowed: KEYCLOAK_CONFIG.realmDefaults.loginWithEmailAllowed,
            passwordPolicy: KEYCLOAK_CONFIG.realmDefaults.passwordPolicy
        });

        logger.info(`[KeycloakService] Realm ${realmName} setup finalized.`);
        return realmName;
    }

    /**
     * Admin: Setup default realm roles
     */
    static async setupDefaultRoles(realm: string, roleNames: string[]) {
        const adminClient = await this.getAdminClient();
        logger.info(`[KeycloakService] Setting up ${roleNames.length} default roles in realm: ${realm}`);

        for (const roleName of roleNames) {
            try {
                await adminClient.roles.create({
                    realm,
                    name: roleName,
                    description: `System defined ${roleName} role`
                });
            } catch (err: any) {
                if (err.response?.status === 409) {
                    logger.warn(`[KeycloakService] Role ${roleName} already exists in realm ${realm}`);
                } else {
                    throw err;
                }
            }
        }
    }

    /**
     * Admin: Create a client in a realm
     */
    static async createClient(realm: string, clientId: string, rootUrl: string) {
        const adminClient = await this.getAdminClient();
        logger.info(`[KeycloakService] Creating client ${clientId} in realm: ${realm}`);

        try {
            await adminClient.clients.create({
                realm,
                clientId,
                ...KEYCLOAK_CONFIG.clientDefaults,
                rootUrl,
                redirectUris: [`${rootUrl}/*`],
                webOrigins: [rootUrl],
            });
        } catch (err: any) {
            if (err.response?.status === 409) {
                logger.warn(`[KeycloakService] Client ${clientId} already exists in realm ${realm}`);
            } else {
                throw err;
            }
        }
    }



    /**
     * Admin: Create a user in Keycloak (basic)
     * CQ-01 FIX: Added typed parameter instead of `any`
     */
    static async createUser(realm: string, userData: CreateKeycloakUserData) {
        const adminClient = await this.getAdminClient();
        return await adminClient.users.create({
            ...KEYCLOAK_CONFIG.userDefaults,
            realm,
            email: userData.email.toLowerCase(),
            firstName: userData.firstName || KEYCLOAK_CONFIG.userDefaults.firstName,
            lastName: userData.lastName || KEYCLOAK_CONFIG.userDefaults.lastName,
            username: userData.username || userData.email.toLowerCase(),
        });
    }

    /**
     * Admin: Get user groups
     */
    static async getUserGroups(realm: string, userId: string) {
        const adminClient = await this.getAdminClient();
        return await adminClient.users.listGroups({ realm, id: userId });
    }

    /**
     * Admin: Find user by email
     */
    static async findUserByEmail(realm: string, email: string) {
        const adminClient = await this.getAdminClient();
        const users = await adminClient.users.find({
            realm,
            email: email.toLowerCase(),
            exact: true
        });
        return users.length > 0 ? users[0] : null;
    }

    /**
     * Admin: Ensure a user is fully set up (clears required actions and sets permanent password)
     * Useful for retried onboarding or fixing users with "Account is not fully set up" errors.
     */
    static async ensureUserIsFullySetUp(realm: string, email: string, password?: string) {
        const adminClient = await this.getAdminClient();
        const user = await this.findUserByEmail(realm, email);

        if (!user || !user.id) {
            throw new AppError(`User ${email} not found in realm ${realm}`, 404);
        }

        logger.info(`[KeycloakService] Forced thorough setup for user ${email} in realm ${realm}...`);

        // 1. Explicitly clear ANY required actions and ensure active profile fields
        const firstName = user.firstName || KEYCLOAK_CONFIG.userDefaults.firstName;
        const lastName = user.lastName || KEYCLOAK_CONFIG.userDefaults.lastName;

        logger.info(`[KeycloakService] Updating profile for ${email}: "${firstName} ${lastName}"`);

        await adminClient.users.update(
            { realm, id: user.id },
            {
                ...KEYCLOAK_CONFIG.userDefaults,
                firstName,
                lastName
            }
        );

        // 2. Set password as permanent
        if (password) {
            await adminClient.users.resetPassword({
                realm,
                id: user.id,
                credential: {
                    type: 'password',
                    value: password,
                    temporary: false
                }
            });
            // SEC-06 FIX: Mask email in logs to avoid PII exposure
            const maskedEmail = email.replace(/(.{1,3})(.*)(@.*)/, '$1***$3');
            logger.info(`[KeycloakService] Permanent password set for user: ${maskedEmail}`);
        }

        // 3. Final verification - Clear actions again and double check profile
        await adminClient.users.update(
            { realm, id: user.id },
            {
                requiredActions: [],
                emailVerified: true,
                enabled: true
            }
        );

        // SEC-06 FIX: Mask email in logs to avoid PII exposure
        const maskedEmail = email.replace(/(.{1,3})(.*)(@.*)/, '$1***$3');
        logger.info(`[KeycloakService] User ${maskedEmail} verified as fully set up.`);
        return user.id;
    }

    /**
     * Admin: Create a user with credentials and roles
     * CQ-01 FIX: Using typed KeycloakUserPayload instead of `any`
     * @returns The created user's Keycloak ID
     */
    static async createUserWithCredentials(
        realm: string,
        userData: CreateKeycloakUserData,
        password: string,
        roles: string[] = []
    ): Promise<string> {
        const adminClient = await this.getAdminClient();

        // Check if user already exists
        const existingUser = await this.findUserByEmail(realm, userData.email);
        if (existingUser) {
            throw new AppError(`User with email ${userData.email} already exists in Keycloak`, 409);
        }

        // Create user with ALL flags set (Belt and Suspenders approach)
        const firstName = userData.firstName || KEYCLOAK_CONFIG.userDefaults.firstName;
        const lastName = userData.lastName || KEYCLOAK_CONFIG.userDefaults.lastName;

        logger.info(`[KeycloakService] Creating user in Keycloak: ${userData.email} (Names: ${firstName} ${lastName})`);

        // CQ-01 FIX: Use typed interface instead of `any`
        const userPayload: KeycloakUserPayload = {
            ...KEYCLOAK_CONFIG.userDefaults,
            realm,
            email: userData.email.toLowerCase(),
            username: userData.username || userData.email.toLowerCase(),
            firstName,
            lastName,
            credentials: [{
                type: 'password',
                value: password,
                temporary: false
            }]
        };

        const userResponse = await adminClient.users.create(userPayload);

        // Resolve User ID
        let keycloakUserId: string;
        if (userResponse && userResponse.id) {
            keycloakUserId = userResponse.id;
        } else {
            const newUser = await this.findUserByEmail(realm, userData.email);
            if (!newUser || !newUser.id) {
                throw new AppError('Failed to retrieve created user from Keycloak', 500);
            }
            keycloakUserId = newUser.id;
        }

        // Forced secondary setup (Ensures settings stick even if initial 'create' ignored them)
        await this.ensureUserIsFullySetUp(realm, userData.email, password);

        // Assign roles if provided
        if (roles.length > 0) {
            await this.assignRealmRoles(realm, keycloakUserId, roles);
        }

        return keycloakUserId;
    }

    /**
     * Admin: Assign realm roles to a user
     */
    static async assignRealmRoles(realm: string, userId: string, roleNames: string[]): Promise<void> {
        const adminClient = await this.getAdminClient();

        // Get all available realm roles
        const allRoles = await adminClient.roles.find({ realm });

        // Filter to get only the roles we want to assign
        const rolesToAssign = allRoles.filter(role =>
            role.name && roleNames.includes(role.name)
        );

        if (rolesToAssign.length === 0) {
            logger.warn(`[KeycloakService] No matching roles found for: ${roleNames.join(', ')}`);
            return;
        }

        // Assign roles to user
        await adminClient.users.addRealmRoleMappings({
            realm,
            id: userId,
            roles: rolesToAssign.map(role => ({
                id: role.id!,
                name: role.name!
            }))
        });
    }

    /**
     * Admin: Set or reset user password
     */
    static async setUserPassword(
        realm: string,
        userId: string,
        password: string,
        temporary: boolean = true
    ): Promise<void> {
        const adminClient = await this.getAdminClient();

        await adminClient.users.resetPassword({
            realm,
            id: userId,
            credential: {
                type: 'password',
                value: password,
                temporary
            }
        });
    }

    /**
     * Admin: Delete a user from Keycloak
     */
    static async deleteUser(realm: string, userId: string): Promise<void> {
        const adminClient = await this.getAdminClient();
        await adminClient.users.del({ realm, id: userId });
    }

    /**
     * Admin: Disable a user in Keycloak (soft delete)
     */
    static async disableUser(realm: string, userId: string): Promise<void> {
        const adminClient = await this.getAdminClient();
        await adminClient.users.update(
            { realm, id: userId },
            { enabled: false }
        );
    }

    /**
     * Admin: Get user's roles
     */
    static async getUserRoles(realm: string, userId: string): Promise<string[]> {
        const adminClient = await this.getAdminClient();
        const roleMappings = await adminClient.users.listRealmRoleMappings({
            realm,
            id: userId
        });
        return roleMappings.map(role => role.name!).filter(Boolean);
    }

    /**
     * Admin: Remove realm roles from a user
     */
    static async removeRealmRoles(realm: string, userId: string, roleNames: string[]): Promise<void> {
        const adminClient = await this.getAdminClient();

        const allRoles = await adminClient.roles.find({ realm });
        const rolesToRemove = allRoles.filter(role =>
            role.name && roleNames.includes(role.name)
        );

        if (rolesToRemove.length > 0) {
            await adminClient.users.delRealmRoleMappings({
                realm,
                id: userId,
                roles: rolesToRemove.map(role => ({
                    id: role.id!,
                    name: role.name!
                }))
            });
        }
    }
}

