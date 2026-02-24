// ============================================================================
// MFA Verify Screen - shown when login returns 403 MFA_REQUIRED
// No redesign. Functional only.
// ============================================================================
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useVerifyMfaMutation } from '../api/endpoints/authApi';
import { mfaSchema, type MfaFormData } from '@/core/validation/schemas';

interface MfaVerifyScreenProps {
    mfaToken?: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function MfaVerifyScreen({ mfaToken, onSuccess, onCancel }: MfaVerifyScreenProps) {
    const [error, setError] = useState('');
    const [verifyMfa, { isLoading }] = useVerifyMfaMutation();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<MfaFormData>({
        resolver: zodResolver(mfaSchema),
        defaultValues: { code: '' },
    });

    const onSubmit = async (data: MfaFormData) => {
        setError('');
        try {
            const result = await verifyMfa({ totpCode: data.code, mfaToken }).unwrap();
            if (result.success) {
                onSuccess();
            } else {
                setError('Invalid code. Please try again.');
            }
        } catch (err: unknown) {
            const apiErr = err as { data?: { message?: string } };
            setError(apiErr?.data?.message || 'Invalid code. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm shadow-lg">
                <h2 className="text-xl font-semibold text-foreground mb-2">Two-Factor Authentication</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Enter the 6-digit code from your authenticator app to continue.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            autoFocus
                            {...register('code')}
                            placeholder="000000"
                            className="w-full text-center text-2xl tracking-widest border border-border rounded-lg px-4 py-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={isLoading || isSubmitting}
                        />
                    </div>

                    {(error || errors.code) && (
                        <p className="text-sm text-red-500 text-center">{error || errors.code?.message}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || isSubmitting}
                        className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                        {isLoading || isSubmitting ? 'Verifying...' : 'Verify'}
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading || isSubmitting}
                        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                        Cancel - go back to login
                    </button>
                </form>
            </div>
        </div>
    );
}
