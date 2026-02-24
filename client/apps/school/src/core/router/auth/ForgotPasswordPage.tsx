// Updated Forgot Password Page - Using common auth components
import { useState } from 'react';
import { useForgotPasswordMutation } from '../../api/endpoints/authApi';
import { AuthLayout, ForgotPasswordForm } from '@/common/components/auth';
import { formatApiError } from '@/common/services/apiHelpers';

export default function ForgotPasswordPage() {
    const [forgotPassword, { isLoading, error }] = useForgotPasswordMutation();
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (email: string) => {
        try {
            await forgotPassword({ email }).unwrap();
            setIsSuccess(true);
        } catch (err) {
            console.error('Forgot password failed:', err);
        }
    };

    return (
        <AuthLayout
            title="Forgot password?"
            subtitle="No worries, we'll send you reset instructions"
        >
            <ForgotPasswordForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                isSuccess={isSuccess}
                error={error ? formatApiError(error) : null}
            />
        </AuthLayout>
    );
}
