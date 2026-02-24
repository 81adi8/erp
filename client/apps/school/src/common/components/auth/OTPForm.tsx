// OTP Verification Form
import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { Button } from '@erp/common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { otpSchema, type OtpFormData } from '@/core/validation/schemas';

interface OTPFormProps {
    onSubmit: (otp: string) => void;
    onResend?: () => void;
    isLoading?: boolean;
    error?: string | null;
    email?: string;
    length?: number;
}

export function OTPForm({
    onSubmit,
    onResend,
    isLoading = false,
    error,
    email,
    length = 6,
}: OTPFormProps) {
    const [otpDigits, setOtpDigits] = useState<string[]>(new Array(length).fill(''));
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<OtpFormData>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: '' },
    });

    const submitForm = (data: OtpFormData) => {
        onSubmit(data.otp);
    };

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const nextChar = value.slice(-1);
        const nextDigits = [...otpDigits];
        nextDigits[index] = nextChar;
        setOtpDigits(nextDigits);
        const nextOtp = nextDigits.join('');
        setValue('otp', nextOtp, { shouldValidate: true, shouldDirty: true });

        if (nextChar && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        const normalized = nextOtp.replace(/\D/g, '');
        if (nextDigits.every((digit) => digit) && normalized.length === length) {
            void handleSubmit(submitForm)();
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!otpDigits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
            const nextDigits = [...otpDigits];
            nextDigits[index] = '';
            setOtpDigits(nextDigits);
            setValue('otp', nextDigits.join(''), { shouldValidate: true, shouldDirty: true });
        }
    };

    const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, length);
        if (!/^\d+$/.test(pastedData)) return;

        const nextDigits = new Array(length).fill('');
        pastedData.split('').forEach((char, idx) => {
            if (idx < length) nextDigits[idx] = char;
        });
        setOtpDigits(nextDigits);
        setValue('otp', pastedData, { shouldValidate: true, shouldDirty: true });
        if (pastedData.length === length) {
            void handleSubmit(submitForm)();
        }
    };

    const handleResend = () => {
        if (resendCooldown > 0) return;
        onResend?.();
        setResendCooldown(60);
        const interval = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    return (
        <form onSubmit={handleSubmit(submitForm)} className="space-y-6">
            <input type="hidden" {...register('otp')} />

            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {email && (
                <p className="text-muted-foreground text-center">
                    We've sent a code to <strong className="text-foreground">{email}</strong>
                </p>
            )}

            <div className="flex justify-center gap-3">
                {Array.from({ length }).map((_, index) => (
                    <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otpDigits[index] ?? ''}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className="w-12 h-14 text-center text-xl font-bold rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                ))}
            </div>
            {errors.otp && (
                <p className="text-sm text-red-500 text-center">{errors.otp.message}</p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading || isSubmitting} disabled={isLoading || isSubmitting}>
                Verify Code
            </Button>

            <div className="text-center">
                <span className="text-sm text-muted-foreground">Didn't receive the code? </span>
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="text-sm text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                </button>
            </div>
        </form>
    );
}
