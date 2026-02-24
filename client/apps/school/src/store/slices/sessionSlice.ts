import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AcademicSession } from '../../core/api/endpoints/academicsApi';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'erp_selected_academic_session';

// ============================================================================
// Types
// ============================================================================

interface AcademicSessionState {
    /** The ID of the currently selected academic session */
    selectedSessionId: string | null;
    /** Cached minimal session info for display (avoids extra API call) */
    selectedSessionInfo: SessionInfo | null;
}

export interface SessionInfo {
    id: string;
    name: string;
    code?: string;
    isCurrent: boolean;
    status: string;
    startDate: string;
    endDate: string;
}

// ============================================================================
// Persistence Helpers
// ============================================================================

function loadFromStorage(): AcademicSessionState {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved) as AcademicSessionState;
        }
    } catch {
        // Fallback to defaults silently
    }
    return {
        selectedSessionId: null,
        selectedSessionInfo: null,
    };
}

function saveToStorage(state: AcademicSessionState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Handle potential quota exceeded
    }
}

// ============================================================================
// Slice
// ============================================================================

const initialState: AcademicSessionState = loadFromStorage();

const sessionSlice = createSlice({
    name: 'session',
    initialState,
    reducers: {
        setSelectedSession(state, action: PayloadAction<SessionInfo>) {
            state.selectedSessionId = action.payload.id;
            state.selectedSessionInfo = action.payload;
            saveToStorage(state);
        },
        setSelectedSessionFromApi(state, action: PayloadAction<AcademicSession>) {
            const session = action.payload;
            state.selectedSessionId = session.id;
            state.selectedSessionInfo = {
                id: session.id,
                name: session.name,
                code: session.code,
                isCurrent: session.is_current,
                status: session.status,
                startDate: session.start_date,
                endDate: session.end_date,
            };
            saveToStorage(state);
        },
        clearSelectedSession(state) {
            state.selectedSessionId = null;
            state.selectedSessionInfo = null;
            saveToStorage(state);
        },
    },
});

export const {
    setSelectedSession,
    setSelectedSessionFromApi,
    clearSelectedSession,
} = sessionSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

export const selectSelectedSessionId = (state: { session: AcademicSessionState }) =>
    state.session.selectedSessionId;

export const selectSelectedSessionInfo = (state: { session: AcademicSessionState }) =>
    state.session.selectedSessionInfo;

export default sessionSlice.reducer;
