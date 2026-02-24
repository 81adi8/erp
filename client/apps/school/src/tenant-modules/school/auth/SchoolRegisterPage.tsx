import { Button } from '@erp/common';
import { SchoolAuthLayout } from './SchoolAuthLayout';
import { useKeycloakAuth } from '../../../core/auth/KeycloakAuthContext';

export function SchoolRegisterPage() {
    const { login, isLoading } = useKeycloakAuth();

    return (
        <SchoolAuthLayout
            title="Account Access via School Identity"
            subtitle="User onboarding is managed through secure OIDC identity flow."
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    To create or activate your account, continue to the school identity provider.
                    If your account is not provisioned, contact your school administrator.
                </p>
                <Button
                    className="w-full"
                    onClick={() => login()}
                    disabled={isLoading}
                >
                    Continue With School Identity
                </Button>
            </div>
        </SchoolAuthLayout>
    );
}

export default SchoolRegisterPage;

