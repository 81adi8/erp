// ============================================================================
// Admin Portal Layout - Uses shared PortalLayout
// ============================================================================

import { Shield } from 'lucide-react';
import { PortalLayout, type PortalConfig } from '../../../shared/components';

const ADMIN_CONFIG: PortalConfig = {
    id: 'admin',
    name: 'Admin Portal',
    icon: Shield,
    accentColor: 'text-primary',
    iconBgColor: 'bg-primary/10',
};

export default function AdminLayout() {
    return <PortalLayout config={ADMIN_CONFIG} showSearch />;
}
