import React from 'react';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';
import { Building2, Globe } from 'lucide-react';

export interface InstitutionSelectProps {
    value?: string | number;
    onChange: (value: string | number) => void;
    institutions: { id: string | number; name: string; subdomain?: string; logo?: string }[];
    label?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
}

export const InstitutionSelect: React.FC<InstitutionSelectProps> = ({
    value,
    onChange,
    institutions,
    label = "Select Institution",
    placeholder = "Search and select institution...",
    error,
    disabled = false
}) => {
    const options: SearchableSelectOption[] = institutions.map(inst => ({
        value: inst.id,
        label: inst.name,
        description: inst.subdomain ? `${inst.subdomain}.schoolerp.com` : undefined,
        icon: <Building2 size={16} className="text-primary" />
    }));

    return (
        <SearchableSelect
            options={options}
            value={value}
            onChange={onChange}
            label={label}
            placeholder={placeholder}
            error={error}
            disabled={disabled}
            renderOption={(option) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{option.label}</p>
                        {option.description && (
                            <p className="text-[10px] text-text-muted flex items-center gap-1">
                                <Globe size={10} />
                                {option.description}
                            </p>
                        )}
                    </div>
                </div>
            )}
        />
    );
};
