import { Button } from '@erp/common';
import { SchoolAuthLayout } from './SchoolAuthLayout';
import { useKeycloakAuth } from '../../../core/auth/KeycloakAuthContext';

export function SchoolResetPasswordPage() {
    const { login, isLoading } = useKeycloakAuth();

    return (
        <SchoolAuthLayout
            title="Password Management via School Identity"
            subtitle="Use the identity provider flow to update or reset your password."
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Password reset tokens from legacy auth are deprecated for school tenant authentication.
                    Continue to identity provider to manage password securely.
                </p>
                <Button
                    className="w-full"
                    onClick={() => login()}
                    disabled={isLoading}
                >
                    Continue To Identity Provider
                </Button>
            </div>
        </SchoolAuthLayout>
    );
}

export default SchoolResetPasswordPage;

