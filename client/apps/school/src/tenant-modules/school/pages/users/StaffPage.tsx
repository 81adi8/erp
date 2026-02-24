// Staff Page - Shared across portals
import { Briefcase } from 'lucide-react';
import { UserManagementPage } from './UserManagementPage';
import { USER_TYPES } from '../../constants';

export const StaffPage = () => (
    <UserManagementPage
        userType={USER_TYPES.STAFF}
        title="Staff"
        description="Manage administrative and support staff"
        icon={Briefcase}
        iconColor="text-amber-500"
        iconBg="bg-amber-500/10"
        permissionPrefix="user.staff"
    />
);

export default StaffPage;
