// Students Page - Shared across portals
import { BookOpen } from 'lucide-react';
import { UserManagementPage } from './UserManagementPage';
import { USER_TYPES } from '../../constants';

export const StudentsPage = () => (
    <UserManagementPage
        userType={USER_TYPES.STUDENT}
        title="Students"
        description="Manage student records and information"
        icon={BookOpen}
        iconColor="text-emerald-500"
        iconBg="bg-emerald-500/10"
        permissionPrefix="academics.students"
    />
);

export default StudentsPage;
