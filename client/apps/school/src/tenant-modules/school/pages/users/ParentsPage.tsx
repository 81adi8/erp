// Parents Page - Shared across portals
import { UserCheck } from 'lucide-react';
import { UserManagementPage } from './UserManagementPage';
import { USER_TYPES } from '../../constants';

export const ParentsPage = () => (
    <UserManagementPage
        userType={USER_TYPES.PARENT}
        title="Parents"
        description="Manage parent and guardian accounts"
        icon={UserCheck}
        iconColor="text-pink-500"
        iconBg="bg-pink-500/10"
        permissionPrefix="parents"
    />
);

export default ParentsPage;
