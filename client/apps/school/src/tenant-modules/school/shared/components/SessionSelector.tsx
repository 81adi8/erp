// ============================================================================
// Academic Session Selector - Global header component
// ============================================================================
// Displays the active academic session and allows switching between sessions.
// When session changes, all RTK Query caches are invalidated to refetch data.
// ============================================================================

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    ChevronDown,
    Check,
    GraduationCap,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { Tooltip } from '@erp/common';
import { useGetAcademicSessionsQuery } from '../../../../core/api/endpoints/academicsApi';
import type { AcademicSession } from '../../../../core/api/endpoints/academicsApi';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import {
    setSelectedSessionFromApi,
    selectSelectedSessionId,
    selectSelectedSessionInfo,
} from '../../../../store/slices/sessionSlice';
import { baseApi } from '../../../../core/api/baseApi';

// ============================================================================
// Types
// ============================================================================

interface SessionSelectorProps {
    className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getSessionStatusColor(status: string): string {
    switch (status) {
        case 'ACTIVE':
            return 'bg-emerald-500';
        case 'DRAFT':
            return 'bg-amber-500';
        case 'COMPLETED':
            return 'bg-blue-500';
        case 'ARCHIVED':
            return 'bg-gray-400';
        default:
            return 'bg-gray-400';
    }
}

function getSessionStatusBadge(status: string): { text: string; className: string } {
    switch (status) {
        case 'ACTIVE':
            return { text: 'Active', className: 'bg-emerald-500/10 text-emerald-600' };
        case 'DRAFT':
            return { text: 'Draft', className: 'bg-amber-500/10 text-amber-600' };
        case 'COMPLETED':
            return { text: 'Completed', className: 'bg-blue-500/10 text-blue-600' };
        case 'ARCHIVED':
            return { text: 'Archived', className: 'bg-gray-500/10 text-gray-500' };
        default:
            return { text: status, className: 'bg-gray-500/10 text-gray-500' };
    }
}

function formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
    return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`;
}

// ============================================================================
// Component
// ============================================================================

export function SessionSelector({ className = '' }: SessionSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();

    const selectedSessionId = useAppSelector(selectSelectedSessionId);
    const selectedSessionInfo = useAppSelector(selectSelectedSessionInfo);

    const { data: sessionsResponse, isLoading, isError } = useGetAcademicSessionsQuery({
        limit: 50,
        sortBy: 'start_date',
        sortOrder: 'DESC',
    });

    const sessions: AcademicSession[] = useMemo(
        () => sessionsResponse?.data ?? [],
        [sessionsResponse],
    );

    // Auto-select current session on first load if nothing is selected
    useEffect(() => {
        if (!selectedSessionId && sessions.length > 0) {
            const currentSession = sessions.find(s => s.is_current);
            const fallback = sessions[0];
            dispatch(setSelectedSessionFromApi(currentSession ?? fallback));
        }
    }, [selectedSessionId, sessions, dispatch]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelectSession = useCallback(
        (session: AcademicSession) => {
            if (session.id === selectedSessionId) {
                setIsOpen(false);
                return;
            }
            dispatch(setSelectedSessionFromApi(session));
            // Invalidate ALL cached data so pages re-fetch with the new session
            dispatch(baseApi.util.resetApiState());
            setIsOpen(false);
        },
        [dispatch, selectedSessionId],
    );

    // ── Loading State ──────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-muted animate-pulse ${className}`}>
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground hidden sm:block">Loading sessions…</span>
            </div>
        );
    }

    // ── Error State ────────────────────────────────────────────────────
    if (isError) {
        return (
            <Tooltip content="Failed to load sessions" position="bottom">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 ${className}`}>
                    <AlertCircle className="w-4 h-4 text-error" />
                    <span className="text-xs text-error hidden sm:block">Sessions unavailable</span>
                </div>
            </Tooltip>
        );
    }

    // ── Empty State ────────────────────────────────────────────────────
    if (sessions.length === 0) {
        return (
            <Tooltip content="No academic sessions configured" position="bottom">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-muted ${className}`}>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground hidden sm:block">No sessions</span>
                </div>
            </Tooltip>
        );
    }

    // ── Main Render ────────────────────────────────────────────────────
    const displayName = selectedSessionInfo?.name ?? 'Select Session';
    const currentStatus = selectedSessionInfo?.status ?? '';

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <Tooltip content="Switch Academic Session" position="bottom">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 border border-border/50 transition-all duration-200"
                    aria-label="Select academic session"
                    aria-expanded={isOpen}
                >
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-primary/10">
                            <GraduationCap className="w-4 h-4 text-primary" />
                        </div>
                        <div className="hidden sm:flex flex-col items-start">
                            <span className="text-xs text-muted-foreground leading-none">Session</span>
                            <span className="text-sm font-semibold text-text leading-tight">{displayName}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${getSessionStatusColor(currentStatus)}`} />
                        <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                    </div>
                </motion.button>
            </Tooltip>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50 bg-surface border border-border shadow-xl"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-border bg-muted/30">
                            <h3 className="text-sm font-semibold text-text">Academic Sessions</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Select a session to view its data across all pages
                            </p>
                        </div>

                        {/* Session List */}
                        <div className="max-h-72 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-border">
                            {sessions.map((session) => {
                                const isSelected = session.id === selectedSessionId;
                                const badge = getSessionStatusBadge(session.status);

                                return (
                                    <button
                                        key={session.id}
                                        onClick={() => handleSelectSession(session)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 ${
                                            isSelected
                                                ? 'bg-primary/5 border-l-2 border-primary'
                                                : 'hover:bg-muted/50 border-l-2 border-transparent'
                                        }`}
                                    >
                                        {/* Status dot */}
                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getSessionStatusColor(session.status)}`} />

                                        {/* Session Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-text'}`}>
                                                    {session.name}
                                                </span>
                                                {session.is_current && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-primary/10 text-primary flex-shrink-0">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDateRange(session.start_date, session.end_date)}
                                                </span>
                                                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${badge.className}`}>
                                                    {badge.text}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Check icon */}
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer hint */}
                        <div className="px-4 py-2.5 border-t border-border bg-muted/20">
                            <p className="text-[11px] text-muted-foreground text-center">
                                Switching session will refresh all page data
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SessionSelector;
