import React from 'react';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';
import { School, Users } from 'lucide-react';

export interface ClassSelectOption {
    id: string | number;
    name: string;
    sectionCount?: number;
    studentCount?: number;
    category?: string;
}

export interface ClassSelectProps {
    value?: string | number | (string | number)[];
    onChange: (value: string | number | (string | number)[]) => void;
    classes: ClassSelectOption[];
    label?: string;
    placeholder?: string;
    multiple?: boolean;
    error?: string;
    disabled?: boolean;
    showAllOption?: boolean;
    className?: string;
}

export const ClassSelect: React.FC<ClassSelectProps> = ({
    value,
    onChange,
    classes,
    label = 'Select Class',
    placeholder = 'Search classes...',
    multiple = false,
    error,
    disabled = false,
    showAllOption = false,
    className,
}) => {
    const baseOptions: SearchableSelectOption[] = showAllOption
        ? [{ value: '', label: 'All Classes', description: 'Show all classes', icon: <School size={16} className="text-primary" /> }]
        : [];

    const classOptions: SearchableSelectOption[] = classes.map(cls => ({
        value: cls.id,
        label: cls.name,
        description: buildDescription(cls),
        icon: <School size={16} className="text-primary" />,
    }));

    const options = [...baseOptions, ...classOptions];

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
            className={className}
            renderOption={(option) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <School size={16} className="text-primary" />
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

function buildDescription(cls: ClassSelectOption): string {
    const parts: string[] = [];
    if (cls.sectionCount !== undefined) parts.push(`${cls.sectionCount} Sections`);
    if (cls.studentCount !== undefined) parts.push(`${cls.studentCount} Students`);
    if (cls.category) parts.push(cls.category);
    return parts.join(' · ') || '';
}
