// ============================================================================
// Staff Portal Layout - Uses shared PortalLayout
// ============================================================================

import { Briefcase } from 'lucide-react';
import { PortalLayout, type PortalConfig } from '../../../shared/components';

const STAFF_CONFIG: PortalConfig = {
    id: 'staff',
    name: 'Staff Portal',
    icon: Briefcase,
    accentColor: 'text-amber-500',
    iconBgColor: 'bg-amber-500/10',
};

export default function StaffLayout() {
    return <PortalLayout config={STAFF_CONFIG} showSearch />;
}
