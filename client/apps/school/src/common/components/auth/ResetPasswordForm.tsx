// Reset Password Form
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@erp/common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/core/validation/schemas';

interface ResetPasswordFormProps {
    onSubmit: (password: string, confirmPassword: string) => void;
    isLoading?: boolean;
    isSuccess?: boolean;
    error?: string | null;
    loginPath?: string;
}

export function ResetPasswordForm({
    onSubmit,
    isLoading = false,
    isSuccess = false,
    error,
    loginPath = '/login',
}: ResetPasswordFormProps) {
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const password = watch('password');
    const confirmPassword = watch('confirmPassword');
    const passwordsMatch = password === confirmPassword;

    const submitForm = (data: ResetPasswordFormData) => {
        onSubmit(data.password, data.confirmPassword);
    };

    if (isSuccess) {
        return (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Password Reset Successful!</h3>
                    <p className="text-muted-foreground mt-2">
                        Your password has been reset successfully. You can now sign in with your new password.
                    </p>
                </div>
                <Link to={loginPath}>
                    <Button variant="primary" className="w-full">
                        Sign In
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(submitForm)} className="space-y-6">
            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Password requirements:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                        <span className={password.length >= 8 ? 'text-green-500' : ''}>
                            {password.length >= 8 ? 'Yes' : 'No'}
                        </span>
                        At least 8 characters
                    </li>
                    <li className="flex items-center gap-2">
                        <span className={/[A-Z]/.test(password) ? 'text-green-500' : ''}>
                            {/[A-Z]/.test(password) ? 'Yes' : 'No'}
                        </span>
                        One uppercase letter
                    </li>
                    <li className="flex items-center gap-2">
                        <span className={/[0-9]/.test(password) ? 'text-green-500' : ''}>
                            {/[0-9]/.test(password) ? 'Yes' : 'No'}
                        </span>
                        One number
                    </li>
                </ul>
            </div>

            <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                {...register('password')}
                error={errors.password?.message}
                rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none">
                        {showPassword ? 'Show' : 'Hide'}
                    </button>
                }
            />

            <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message || (confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined)}
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading || isSubmitting} disabled={isLoading || isSubmitting}>
                Reset Password
            </Button>
        </form>
    );
}
