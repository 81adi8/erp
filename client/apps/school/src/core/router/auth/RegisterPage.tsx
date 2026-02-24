// Updated Register Page - Using common auth components
import { useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '../../api/endpoints/authApi';
import { AuthLayout, RegisterForm } from '@/common/components/auth';
import { formatApiError } from '@/common/services/apiHelpers';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [register, { isLoading, error }] = useRegisterMutation();

    const handleRegister = async (data: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        confirmPassword: string;
    }) => {
        if (data.password !== data.confirmPassword) {
            return;
        }
        try {
            await register(data).unwrap();
            navigate('/login');
        } catch (err) {
            console.error('Registration failed:', err);
        }
    };

    return (
        <AuthLayout
            title="Create an account"
            subtitle="Get started with your free account"
        >
            <RegisterForm
                onSubmit={handleRegister}
                isLoading={isLoading}
                error={error ? formatApiError(error) : null}
            />
        </AuthLayout>
    );
}
