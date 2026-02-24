// Updated Reset Password Page - Using common auth components
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResetPasswordMutation } from '../../api/endpoints/authApi';
import { AuthLayout, ResetPasswordForm } from '@/common/components/auth';
import { formatApiError } from '@/common/services/apiHelpers';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const [resetPassword, { isLoading, error }] = useResetPasswordMutation();
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (password: string, confirmPassword: string) => {
        if (password !== confirmPassword) return;
        try {
            await resetPassword({ token, newPassword: password }).unwrap();
            setIsSuccess(true);
        } catch (err) {
            console.error('Reset password failed:', err);
        }
    };

    return (
        <AuthLayout
            title="Reset your password"
            subtitle="Enter your new password below"
        >
            <ResetPasswordForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                isSuccess={isSuccess}
                error={error ? formatApiError(error) : null}
            />
        </AuthLayout>
    );
}
