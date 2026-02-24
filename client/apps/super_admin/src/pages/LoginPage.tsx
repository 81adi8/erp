import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredentials, setRequire2FA, clearRequire2FA } from '../features/auth/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginMutation } from '../services';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [error, setError] = useState('');

    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, require2FA, pendingEmail } = useAppSelector((state) => state.auth);

    const [login, { isLoading }] = useLoginMutation();

    interface LocationState {
        from?: {
            pathname?: string;
        };
    }

    interface LoginError {
        data?: {
            message?: string;
        };
    }

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const from = (location.state as LocationState | null)?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    // If returning to login and 2FA was pending, restore email
    useEffect(() => {
        if (require2FA && pendingEmail) {
            setEmail(pendingEmail);
        }
    }, [require2FA, pendingEmail]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const result = await login({
                email: require2FA ? pendingEmail! : email,
                password,
                twoFactorCode: require2FA ? twoFactorCode : undefined,
            }).unwrap();

            if (result.require2FA) {
                // 2FA required - show code input
                dispatch(setRequire2FA({ email }));
                setPassword(''); // Clear password for security
            } else if (result.success && result.data) {
                // Login successful
                dispatch(setCredentials({
                    user: result.data.user,
                    token: result.data.accessToken,
                }));
            }
        } catch (err: unknown) {
            const loginError = err as LoginError;
            setError(loginError.data?.message || 'Login failed. Please try again.');
            if (require2FA) {
                setTwoFactorCode('');
            }
        }
    };

    const handleCancelTwoFA = () => {
        dispatch(clearRequire2FA());
        setTwoFactorCode('');
        setPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-96 border border-white/20">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-semibold text-white mb-2">
                        {require2FA ? '2FA Verification' : 'Root Admin'}
                    </h1>
                    <p className="text-blue-200 text-sm">
                        {require2FA
                            ? 'Enter the code from your authenticator app'
                            : 'Sign in to manage your platform'
                        }
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!require2FA ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-1">
                                Authentication Code
                            </label>
                            <input
                                type="text"
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                placeholder="000000"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                maxLength={6}
                                autoFocus
                            />
                            <p className="text-blue-300/70 text-xs mt-2 text-center">
                                Logging in as: {pendingEmail}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-blue-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {require2FA ? 'Verifying...' : 'Signing in...'}
                            </span>
                        ) : (
                            require2FA ? 'Verify Code' : 'Sign In'
                        )}
                    </button>

                    {require2FA && (
                        <button
                            type="button"
                            onClick={handleCancelTwoFA}
                            className="w-full text-blue-300 hover:text-white py-2 text-sm transition"
                        >
                            ← Back to Login
                        </button>
                    )}
                </form>

                <div className="mt-8 text-center">
                    <p className="text-blue-300/50 text-xs">
                        Secure admin access • SchoolERP Platform
                    </p>
                </div>
            </div>
        </div>
    );
};
