
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: Record<string, boolean>;
    is_main: boolean;
    is_two_factor_enabled: boolean;
}

export interface AuthState {
    user: AdminUser | null;
    token: string | null; // Kept in memory only, HTTP-only cookie is the source of truth
    isAuthenticated: boolean;
    require2FA: boolean;
    pendingEmail: string | null;
}

/**
 * Load user info from sessionStorage (survives page refresh within same tab).
 * Token is NOT stored anywhere - it's in HTTP-only cookie.
 * On page refresh, we need to verify auth via a /me endpoint or similar.
 */
const loadFromStorage = (): Partial<AuthState> => {
    try {
        const userStr = sessionStorage.getItem('auth_user');
        if (userStr) {
            return {
                user: JSON.parse(userStr),
                isAuthenticated: true,
                token: null, // Token managed by HTTP-only cookie
            };
        }
    } catch {
        // Ignore parsing errors
    }
    return {};
};

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    require2FA: false,
    pendingEmail: null,
    ...loadFromStorage(),
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: AdminUser; token?: string }>) => {
            const { user, token } = action.payload;
            state.user = user;
            state.token = token || null; // Token in memory only (for API calls if needed)
            state.isAuthenticated = true;
            state.require2FA = false;
            state.pendingEmail = null;
            // Store user info in sessionStorage (not token!)
            sessionStorage.setItem('auth_user', JSON.stringify(user));
        },
        setRequire2FA: (state, action: PayloadAction<{ email: string }>) => {
            state.require2FA = true;
            state.pendingEmail = action.payload.email;
        },
        clearRequire2FA: (state) => {
            state.require2FA = false;
            state.pendingEmail = null;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.require2FA = false;
            state.pendingEmail = null;
            // Clear sessionStorage
            sessionStorage.removeItem('auth_user');
        },
        updateUser: (state, action: PayloadAction<Partial<AdminUser>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
                sessionStorage.setItem('auth_user', JSON.stringify(state.user));
            }
        },
    },
});

export const { setCredentials, setRequire2FA, clearRequire2FA, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
