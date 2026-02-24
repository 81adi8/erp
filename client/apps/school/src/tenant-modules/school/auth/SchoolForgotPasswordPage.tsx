import { Button } from '@erp/common';
import { SchoolAuthLayout } from './SchoolAuthLayout';
import { useKeycloakAuth } from '../../../core/auth/KeycloakAuthContext';

export function SchoolForgotPasswordPage() {
    const { login, isLoading } = useKeycloakAuth();

    return (
        <SchoolAuthLayout
            title="Reset Password via School Identity"
            subtitle="Password reset is handled by the OIDC identity provider."
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Continue to the school identity page and use the
                    <strong> Forgot Password</strong> option there.
                </p>
                <Button
                    className="w-full"
                    onClick={() => login()}
                    disabled={isLoading}
                >
                    Go To Identity Provider
                </Button>
            </div>
        </SchoolAuthLayout>
    );
}

export default SchoolForgotPasswordPage;

