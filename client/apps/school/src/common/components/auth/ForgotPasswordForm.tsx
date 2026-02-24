// Forgot Password Form
import { Link } from 'react-router-dom';
import { Button, Input } from '@erp/common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/core/validation/schemas';

interface ForgotPasswordFormProps {
    onSubmit: (email: string) => void;
    isLoading?: boolean;
    isSuccess?: boolean;
    error?: string | null;
    loginPath?: string;
}

export function ForgotPasswordForm({
    onSubmit,
    isLoading = false,
    isSuccess = false,
    error,
    loginPath = '/login',
}: ForgotPasswordFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    });

    const email = watch('email');

    const submitForm = (data: ForgotPasswordFormData) => {
        onSubmit(data.email);
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
                    <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
                    <p className="text-muted-foreground mt-2">
                        We've sent a password reset link to <strong>{email}</strong>
                    </p>
                </div>
                <Link to={loginPath}>
                    <Button variant="outline" className="w-full">
                        Back to Sign In
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

            <p className="text-muted-foreground">
                Enter your email address and we'll send you instructions to reset your password.
            </p>

            <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                error={errors.email?.message}
                leftIcon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                }
            />

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading || isSubmitting} disabled={isLoading || isSubmitting}>
                Send Reset Link
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link to={loginPath} className="text-primary hover:underline font-medium">
                    Sign in
                </Link>
            </p>
        </form>
    );
}
