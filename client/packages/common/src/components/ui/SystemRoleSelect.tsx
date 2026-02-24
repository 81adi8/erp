import React, { useMemo } from 'react';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';
import { Users } from 'lucide-react';
import type { SystemRole } from '../../types/system';

export interface SystemRoleSelectProps {
    value?: string;
    onChange: (value: string) => void;
    tenantType?: string;
    roleTypes?: string[];
    institutionRoles?: Record<string, SystemRole[]>;
    label?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
}

export const SystemRoleSelect: React.FC<SystemRoleSelectProps> = ({
    value,
    onChange,
    tenantType = 'all',
    roleTypes = [],
    institutionRoles = {},
    label = "System Role Type",
    placeholder = "Select system role type...",
    error,
    disabled = false
}) => {
    const options: SearchableSelectOption[] = useMemo(() => {
        // Default generic roles if no metadata provided
        const defaultRoles = [
            { value: 'admin', label: 'Admin' },
            { value: 'sub_admin', label: 'Sub Admin' },
            { value: 'teacher', label: 'Teacher' },
            { value: 'student', label: 'Student' },
            { value: 'staff', label: 'Staff' },
            { value: 'parent', label: 'Parent' },
            { value: 'other', label: 'Other' },
        ];

        // If specific tenant type selected, show roles for that type
        if (tenantType && tenantType !== 'all' && institutionRoles[tenantType]) {
            return institutionRoles[tenantType].map(r => ({
                value: r.id,
                label: r.label,
                description: r.description,
                icon: <Users size={16} className="text-primary" />
            }));
        }

        // Use roleTypes if provided, otherwise defaultRoles
        const baseRoles = roleTypes.length > 0
            ? roleTypes.map(t => ({
                value: t,
                label: t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            }))
            : defaultRoles;

        return baseRoles.map(r => ({
            ...r,
            icon: <Users size={16} className="text-primary" />
        }));
    }, [tenantType, roleTypes, institutionRoles]);

    return (
        <SearchableSelect
            options={options}
            value={value}
            onChange={onChange}
            label={label}
            placeholder={placeholder}
            error={error}
            disabled={disabled}
        />
    );
};
