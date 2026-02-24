import React, { useMemo } from 'react';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';
import { Building2 } from 'lucide-react';

export interface InstitutionTypeSelectProps {
    value?: string;
    onChange: (value: string) => void;
    institutionTypes?: string[];
    label?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    showAllOption?: boolean;
}

export const InstitutionTypeSelect: React.FC<InstitutionTypeSelectProps> = ({
    value,
    onChange,
    institutionTypes = ['school', 'university', 'coaching'],
    label = "Tenant Type",
    placeholder = "Select institution type...",
    error,
    disabled = false,
    showAllOption = true
}) => {
    const options: SearchableSelectOption[] = useMemo(() => {
        const types = institutionTypes.map(t => ({
            value: t,
            label: t.charAt(0).toUpperCase() + t.slice(1),
            description: `Templates specifically for ${t}s`,
            icon: <Building2 size={16} className="text-primary" />
        }));

        if (showAllOption) {
            return [
                {
                    value: 'all',
                    label: 'All Types',
                    description: 'Universal templates applied to all institutions'
                },
                ...types
            ];
        }

        return types;
    }, [institutionTypes, showAllOption]);

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
