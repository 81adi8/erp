// ============================================================================
// Teacher Portal Layout - Uses shared PortalLayout
// ============================================================================

import { GraduationCap } from 'lucide-react';
import { PortalLayout, type PortalConfig } from '../../../shared/components';

const TEACHER_CONFIG: PortalConfig = {
    id: 'teacher',
    name: 'Teacher Portal',
    icon: GraduationCap,
    accentColor: 'text-blue-500',
    iconBgColor: 'bg-blue-500/10',
};

export default function TeacherLayout() {
    return <PortalLayout config={TEACHER_CONFIG} showSearch />;
}
