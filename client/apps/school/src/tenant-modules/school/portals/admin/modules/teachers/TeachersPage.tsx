import { GraduationCap } from 'lucide-react';
import { UserManagementPage } from '../../../../pages/users/UserManagementPage';
import { USER_TYPES } from '../../../../constants';

export default function TeachersPage() {
    return (
        <UserManagementPage
            userType={USER_TYPES.TEACHER}
            title="Teachers"
            description="Manage your school's teaching staff"
            icon={GraduationCap}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
            permissionPrefix="academics.teachers"
        />
    );
}
