// Staff Page - Using centralized UserManagementPage component
import { Briefcase } from 'lucide-react';
import { UserManagementPage } from '../../../../pages/users/UserManagementPage';

export default function StaffPage() {
    return (
        <UserManagementPage
            userType="staff"
            title="Staff"
            description="Manage administrative and support staff"
            icon={Briefcase}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
            permissionPrefix="staff"
        />
    );
}
