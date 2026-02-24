import KEYCLOAK_CONFIG from '@/core/config/keycloak.config';

/**
 * Keycloak "Direct Access Grant" Utility
 * Fetches OpenID Connect tokens directly from Keycloak using username/password.
 */


export interface KeycloakTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    refresh_token: string;
    token_type: string;
    'not-before-policy': number;
    session_state: string;
    scope: string;
}

/**
 * Fetch token from Keycloak using Resource Owner Password Credentials Grant
 */
export async function fetchKeycloakToken(
    username: string,
    password: string,
    realmName?: string
): Promise<KeycloakTokenResponse> {
    const realm = realmName || KEYCLOAK_CONFIG.realm;
    const url = KEYCLOAK_CONFIG.getEndpoints(realm).token;

    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', KEYCLOAK_CONFIG.clientId);
    params.append('username', username);
    params.append('password', password);

    console.log(`[KeycloakUtil] Fetching token for realm: ${realm}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[KeycloakUtil] Auth failed for realm ${realm}:`, errorData);
        throw new Error(errorData.error_description || 'Authentication with Keycloak failed');
    }

    return response.json();
}

