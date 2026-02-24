import { type ReactNode } from 'react';
import { useTenant } from '../core/tenant/useTenant';

interface AuthLayoutProps {
    children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    const { tenant } = useTenant();

    return (
        <div className="min-h-screen ">
            {/* <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
                <h2 className="text-center text-3xl font-extrabold text-gray-900">
                    {tenant?.name || 'School ERP'}
                </h2>
                {tenant?.subdomain && (
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {tenant.subdomain}.{window.location.host.split('.').slice(1).join('.')}
                    </p>
                )}
            </div> */}

            <div className="">
                {children}
            </div>
        </div>
    );
}
