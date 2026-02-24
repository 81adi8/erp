// ============================================================================
// MFA Setup Page — guides admin through TOTP enrollment
// Shown when server returns MFA_SETUP_REQUIRED on login
// Flow: setup → scan QR → enter code → confirm → redirect to login
// ============================================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetupMfaMutation } from '../api/endpoints/authApi';
import { secureStorage } from '../storage/SecureStorage';

type Step = 'setup' | 'confirm' | 'done';

interface ApiErrorWithMessage {
    data?: {
        error?: string;
        message?: string;
    };
}

export default function MfaSetupPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('setup');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [setupMfa] = useSetupMfaMutation();

    const handleSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await setupMfa().unwrap();
            if (result.success && result.data) {
                setQrCodeDataUrl(result.data.qrCodeDataUrl || result.data.qrCode || '');
                setSecret(result.data.secret || '');
                setStep('confirm');
            }
        } catch (err: unknown) {
            const apiError = err as ApiErrorWithMessage;
            setError(apiError?.data?.error || apiError?.data?.message || 'Failed to initialize MFA setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (code.length !== 6) {
            setError('Please enter the 6-digit code from your authenticator app.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
            const token = secureStorage.getAuthToken();
            const resp = await fetch(`${apiBaseUrl}/auth/mfa/confirm`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && !secureStorage.isHttpOnlyMarker(token)
                        ? { Authorization: `Bearer ${token}` }
                        : {}),
                },
                body: JSON.stringify({ totpCode: code }),
            });
            const data = await resp.json();
            if (data.success) {
                setBackupCodes(data.data?.backupCodes || []);
                setStep('done');
            } else {
                setError(data.error || 'Invalid code. Please try again.');
            }
        } catch {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-8 w-full max-w-md shadow-lg">

                {/* Step 1: Introduction */}
                {step === 'setup' && (
                    <>
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-3">🔐</div>
                            <h1 className="text-xl font-semibold text-foreground">Set Up Two-Factor Authentication</h1>
                            <p className="text-sm text-muted-foreground mt-2">
                                Your admin account requires MFA. You'll need an authenticator app like
                                Google Authenticator, Authy, or 1Password.
                            </p>
                        </div>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                                {error}
                            </div>
                        )}
                        <button
                            onClick={handleSetup}
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Generating QR Code...' : 'Begin Setup'}
                        </button>
                    </>
                )}

                {/* Step 2: Scan QR + Enter Code */}
                {step === 'confirm' && (
                    <>
                        <div className="text-center mb-4">
                            <h1 className="text-xl font-semibold text-foreground">Scan QR Code</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Open your authenticator app and scan this code.
                            </p>
                        </div>

                        {qrCodeDataUrl && (
                            <div className="flex justify-center mb-4">
                                <img src={qrCodeDataUrl} alt="MFA QR Code" className="w-48 h-48 border border-border rounded-lg" />
                            </div>
                        )}

                        {secret && (
                            <div className="bg-muted rounded-lg px-4 py-2 mb-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Manual entry key:</p>
                                <code className="text-xs font-mono text-foreground break-all">{secret}</code>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Enter the 6-digit code from your app
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={code}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="w-full border border-border rounded-lg px-4 py-2.5 text-center text-xl font-mono tracking-widest bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleConfirm}
                            disabled={loading || code.length !== 6}
                            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Activate MFA'}
                        </button>
                    </>
                )}

                {/* Step 3: Done — show backup codes */}
                {step === 'done' && (
                    <>
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-3">✅</div>
                            <h1 className="text-xl font-semibold text-foreground">MFA Activated</h1>
                            <p className="text-sm text-muted-foreground mt-2">
                                Save these backup codes. They can be used if you lose access to your authenticator app.
                                <strong className="text-foreground"> They will not be shown again.</strong>
                            </p>
                        </div>

                        {backupCodes.length > 0 && (
                            <div className="bg-muted rounded-lg p-4 mb-6 grid grid-cols-2 gap-2">
                                {backupCodes.map((bc, i) => (
                                    <code key={i} className="text-xs font-mono text-foreground text-center py-1 bg-background rounded border border-border">
                                        {bc}
                                    </code>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Continue to Login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
