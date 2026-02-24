// ============================================================================
// Global Error Handler — intercepts 401, 403, 403-MFA, 403-suspended, 500
// Wraps the app. No redesign — functional only.
// ============================================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MfaVerifyScreen from '../auth/MfaVerifyScreen';

type ErrorState =
    | { type: 'none' }
    | { type: 'mfa_required'; mfaToken?: string }
    | { type: 'suspended'; message: string }
    | { type: 'forbidden'; message: string }
    | { type: 'server_error'; message: string };

// Global event bus for API errors
const ERROR_EVENT = 'erp:api_error';

export function emitApiError(error: {
    status: number;
    code?: string;
    message?: string;
    mfaToken?: string;
}) {
    window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: error }));
}

interface GlobalErrorHandlerProps {
    children: React.ReactNode;
}

export default function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
    const [errorState, setErrorState] = useState<ErrorState>({ type: 'none' });
    const navigate = useNavigate();

    useEffect(() => {
        const handleApiError = (e: Event) => {
            const event = e as CustomEvent<{
                status: number;
                code?: string;
                message?: string;
                mfaToken?: string;
            }>;
            const { status, code, message, mfaToken } = event.detail;

            if (status === 403 && code === 'MFA_REQUIRED') {
                setErrorState({ type: 'mfa_required', mfaToken });
                return;
            }

            if (status === 403 && code === 'TENANT_SUSPENDED') {
                setErrorState({
                    type: 'suspended',
                    message: message || 'Your institution account has been suspended. Please contact support.',
                });
                return;
            }

            if (status === 403) {
                setErrorState({
                    type: 'forbidden',
                    message: message || 'You do not have permission to perform this action.',
                });
                return;
            }

            if (status === 500) {
                setErrorState({
                    type: 'server_error',
                    message: message || 'A server error occurred. Please try again.',
                });
                return;
            }
        };

        window.addEventListener(ERROR_EVENT, handleApiError);
        return () => window.removeEventListener(ERROR_EVENT, handleApiError);
    }, []);

    const dismiss = () => setErrorState({ type: 'none' });

    return (
        <>
            {children}

            {/* MFA Required — full screen overlay */}
            {errorState.type === 'mfa_required' && (
                <MfaVerifyScreen
                    mfaToken={errorState.mfaToken}
                    onSuccess={() => {
                        dismiss();
                        // Reload current page to re-fetch with valid session
                        window.location.reload();
                    }}
                    onCancel={() => {
                        dismiss();
                        navigate('/login');
                    }}
                />
            )}

            {/* Tenant Suspended */}
            {errorState.type === 'suspended' && (
                <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-xl p-8 w-full max-w-md shadow-lg text-center">
                        <div className="text-4xl mb-4">🔒</div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Account Suspended</h2>
                        <p className="text-sm text-muted-foreground mb-6">{errorState.message}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            )}

            {/* Forbidden */}
            {errorState.type === 'forbidden' && (
                <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 shadow-lg max-w-sm flex items-start gap-3">
                    <span className="text-lg">⛔</span>
                    <div className="flex-1">
                        <p className="text-sm font-medium">Access Denied</p>
                        <p className="text-xs text-red-600 mt-0.5">{errorState.message}</p>
                    </div>
                    <button onClick={dismiss} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>
            )}

            {/* Server Error */}
            {errorState.type === 'server_error' && (
                <div className="fixed bottom-4 right-4 z-50 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-5 py-4 shadow-lg max-w-sm flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div className="flex-1">
                        <p className="text-sm font-medium">Server Error</p>
                        <p className="text-xs text-orange-600 mt-0.5">{errorState.message}</p>
                    </div>
                    <button onClick={dismiss} className="text-orange-400 hover:text-orange-600 text-lg leading-none">×</button>
                </div>
            )}
        </>
    );
}
