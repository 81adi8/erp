// Register Form Component
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@erp/common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormData } from '@/core/validation/schemas';

interface RegisterFormProps {
    onSubmit: (data: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        confirmPassword: string;
    }) => void;
    isLoading?: boolean;
    error?: string | null;
    loginPath?: string;
}

export function RegisterForm({
    onSubmit,
    isLoading = false,
    error,
    loginPath = '/login',
}: RegisterFormProps) {
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    const password = watch('password');
    const confirmPassword = watch('confirmPassword');
    const passwordsMatch = password === confirmPassword;

    const submitForm = (data: RegisterFormData) => {
        onSubmit(data);
    };

    return (
        <form onSubmit={handleSubmit(submitForm)} className="space-y-5">
            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="First Name"
                    type="text"
                    placeholder="John"
                    {...register('firstName')}
                    error={errors.firstName?.message}
                />
                <Input
                    label="Last Name"
                    type="text"
                    placeholder="Doe"
                    {...register('lastName')}
                    error={errors.lastName?.message}
                />
            </div>

            <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                error={errors.email?.message}
                leftIcon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                }
            />

            <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                {...register('password')}
                error={errors.password?.message}
                leftIcon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                }
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

            <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required className="mt-1 w-4 h-4 rounded border-border text-primary" />
                <span className="text-sm text-muted-foreground">
                    I agree to the{' '}
                    <a href="#" className="text-primary hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </span>
            </label>

            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading || isSubmitting} disabled={isLoading || isSubmitting}>
                Create Account
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to={loginPath} className="text-primary hover:underline font-medium">
                    Sign in
                </Link>
            </p>
        </form>
    );
}
