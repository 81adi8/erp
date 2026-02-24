import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { hasPermission, type PermissionKey } from '../utils/permissions';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: PermissionKey;
}

/**
 * ProtectedRoute component that handles:
 * 1. Authentication check - redirects to login if not authenticated
 * 2. Permission check - shows access denied if permission not granted
 * 
 * Root admins (is_main = true) bypass permission checks.
 */
export const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);
    const location = useLocation();

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check permission if required
    if (requiredPermission && !hasPermission(user, requiredPermission)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <div className="text-red-500 text-6xl mb-4">🚫</div>
                    <h1 className="text-2xl font-semibold text-gray-800 mb-2">Access Denied</h1>
                    <p className="text-gray-600 mb-4">
                        You don't have permission to access this page.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
