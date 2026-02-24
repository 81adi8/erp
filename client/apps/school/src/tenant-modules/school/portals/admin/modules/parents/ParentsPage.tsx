// Parents Page - Using centralized UserManagementPage component
import { UserCheck } from 'lucide-react';
import { UserManagementPage } from '../../../../pages/users/UserManagementPage';

export default function ParentsPage() {
    return (
        <UserManagementPage
            userType="parent"
            title="Parents"
            description="Manage parent and guardian accounts"
            icon={UserCheck}
            iconColor="text-pink-500"
            iconBg="bg-pink-500/10"
            permissionPrefix="parents"
        />
    );
}
