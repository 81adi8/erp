import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
    label?: string;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, hint, options, placeholder, className = '', id, ...props }, ref) => {
        const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-text mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={`
                            w-full px-4 py-2.5 pr-10
                            bg-surface border border-border rounded-lg
                            text-text appearance-none cursor-pointer
                            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-hover
                            transition-colors duration-200
                            ${error ? 'border-error focus:ring-error/50 focus:border-error' : ''}
                            ${className}
                        `}
                        {...props}
                    >
                        {placeholder && (
                            <option value="">
                                {placeholder}
                            </option>
                        )}
                        {options.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-error">{error}</p>
                )}
                {hint && !error && (
                    <p className="mt-1.5 text-sm text-text-muted">{hint}</p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
