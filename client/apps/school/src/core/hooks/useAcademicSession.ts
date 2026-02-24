// ============================================================================
// useAcademicSession Hook
// ============================================================================
// Provides the currently selected academic session context to any component.
// Handles auto-selection of the current session if none is selected.
// ============================================================================

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/store';
import {
    setSelectedSessionFromApi,
    clearSelectedSession,
    selectSelectedSessionId,
    selectSelectedSessionInfo,
    type SessionInfo,
} from '../../store/slices/sessionSlice';
import { useGetAcademicSessionsQuery } from '../api/endpoints/academicsApi';
import type { AcademicSession } from '../api/endpoints/academicsApi';
import { baseApi } from '../api/baseApi';

interface UseAcademicSessionReturn {
    /** The ID of the currently selected session */
    sessionId: string | null;
    /** Cached session info (name, status, dates) */
    sessionInfo: SessionInfo | null;
    /** All available sessions */
    sessions: AcademicSession[];
    /** Whether sessions are loading */
    isLoading: boolean;
    /** Switch to a different session (invalidates all caches) */
    switchSession: (session: AcademicSession) => void;
    /** Clear the selected session */
    clearSession: () => void;
}

export function useAcademicSession(): UseAcademicSessionReturn {
    const dispatch = useAppDispatch();
    const sessionId = useAppSelector(selectSelectedSessionId);
    const sessionInfo = useAppSelector(selectSelectedSessionInfo);

    const { data: sessionsResponse, isLoading } = useGetAcademicSessionsQuery({
        limit: 50,
        sortBy: 'start_date',
        sortOrder: 'DESC',
    });

    const sessions = sessionsResponse?.data ?? [];

    const switchSession = useCallback(
        (session: AcademicSession) => {
            dispatch(setSelectedSessionFromApi(session));
            dispatch(baseApi.util.resetApiState());
        },
        [dispatch],
    );

    const clearSession = useCallback(() => {
        dispatch(clearSelectedSession());
    }, [dispatch]);

    return {
        sessionId,
        sessionInfo,
        sessions,
        isLoading,
        switchSession,
        clearSession,
    };
}
