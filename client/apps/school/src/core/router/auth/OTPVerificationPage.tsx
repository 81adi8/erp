// OTP Verification Page
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout, OTPForm } from '@/common/components/auth';
// Note: You'll need to create verifyOtp mutation in authApi
// import { useVerifyOtpMutation, useResendOtpMutation } from '../../api/endpoints/authApi';

export default function OTPVerificationPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || '';
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Replace with actual mutation
    // const [verifyOtp, { isLoading }] = useVerifyOtpMutation();

    const handleVerify = async (otp: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // await verifyOtp({ email, otp }).unwrap();
            console.log('Verifying OTP:', otp);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid verification code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        // await resendOtp({ email }).unwrap();
        console.log('Resending OTP to:', email);
    };

    return (
        <AuthLayout
            title="Verify your email"
            subtitle="Enter the 6-digit code we sent to your email"
        >
            <OTPForm
                onSubmit={handleVerify}
                onResend={handleResend}
                isLoading={isLoading}
                error={error}
                email={email}
            />
        </AuthLayout>
    );
}
