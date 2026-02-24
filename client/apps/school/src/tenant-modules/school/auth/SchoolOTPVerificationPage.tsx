// School OTP Verification Page
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SchoolAuthLayout } from './SchoolAuthLayout';
import { OTPForm } from '@/common/components/auth';

export function SchoolOTPVerificationPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || '';
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerify = async (otp: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // Replace with actual API call
            console.log('Verifying OTP:', otp);
            await new Promise(resolve => setTimeout(resolve, 1000));
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid verification code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        console.log('Resending OTP to:', email);
    };

    return (
        <SchoolAuthLayout
            title="Verify Your Email 📧"
            subtitle="Enter the code we sent to your email"
        >
            <OTPForm
                onSubmit={handleVerify}
                onResend={handleResend}
                isLoading={isLoading}
                error={error}
                email={email}
            />
        </SchoolAuthLayout>
    );
}

export default SchoolOTPVerificationPage;