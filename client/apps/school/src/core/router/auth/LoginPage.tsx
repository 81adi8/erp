// Updated Login Page - Using common auth components
import { useNavigate } from 'react-router-dom';
import { useKeycloakAuth } from '../../auth/KeycloakAuthContext';
import { AuthLayout, LoginForm } from '@/common/components/auth';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isLoading } = useKeycloakAuth();

    const handleLogin = async (data: { email: string; password: string; rememberMe: boolean }) => {
        try {
            login({ redirectUri: `${window.location.origin}/dashboard` });
        } catch (err) {
            console.error('Login failed:', err);
            navigate('/login');
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to continue to your dashboard"
        >
            <LoginForm
                onSubmit={handleLogin}
                isLoading={isLoading}
                error={null}
            />
        </AuthLayout>
    );
}
