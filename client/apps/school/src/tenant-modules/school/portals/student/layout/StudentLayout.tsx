// ============================================================================
// Student Portal Layout - Uses shared PortalLayout
// ============================================================================

import { BookOpen } from 'lucide-react';
import { PortalLayout, type PortalConfig } from '../../../shared/components';

const STUDENT_CONFIG: PortalConfig = {
    id: 'student',
    name: 'Student Portal',
    icon: BookOpen,
    accentColor: 'text-green-500',
    iconBgColor: 'bg-green-500/10',
};

export default function StudentLayout() {
    return <PortalLayout config={STUDENT_CONFIG} showSearch />;
}
