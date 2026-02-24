import React from 'react';
import { SearchableSelect, type SearchableSelectOption, type SearchableSelectValue } from './SearchableSelect';
import { Layers, Users } from 'lucide-react';

export interface SectionSelectProps {
    value?: SearchableSelectValue;
    onChange: (value: SearchableSelectValue) => void;
    sections: { id: string | number; name: string; className?: string; studentCount?: number }[];
    label?: string;
    placeholder?: string;
    multiple?: boolean;
    error?: string;
    disabled?: boolean;
}

export const SectionSelect: React.FC<SectionSelectProps> = ({
    value,
    onChange,
    sections,
    label = "Select Section",
    placeholder = "Search sections...",
    multiple = false,
    error,
    disabled = false
}) => {
    const options: SearchableSelectOption[] = sections.map(sec => ({
        value: sec.id,
        label: `${sec.className ? sec.className + ' - ' : ''}${sec.name}`,
        description: sec.studentCount !== undefined ? `${sec.studentCount} Students` : undefined,
        icon: <Layers size={16} className="text-primary" />
    }));

    return (
        <SearchableSelect
            options={options}
            value={value}
            onChange={onChange}
            label={label}
            placeholder={placeholder}
            multiple={multiple}
            error={error}
            disabled={disabled}
            renderOption={(option) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Layers size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{option.label}</p>
                        {option.description && (
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px] text-text-muted flex items-center gap-1">
                                    <Users size={10} />
                                    {option.description}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        />
    );
};
