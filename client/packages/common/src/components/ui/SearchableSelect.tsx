import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface SearchableSelectOption {
    value: string | number;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

export type SearchableSelectValue = string | number | Array<string | number>;

export interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value?: SearchableSelectValue;
    onChange: (value: SearchableSelectValue) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    multiple?: boolean;
    disabled?: boolean;
    className?: string;
    searchPlaceholder?: string;
    noOptionsMessage?: string;
    renderOption?: (option: SearchableSelectOption) => React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    error,
    multiple = false,
    disabled = false,
    className = '',
    searchPlaceholder = 'Search...',
    noOptionsMessage = 'No options found',
    renderOption,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Selected values mapping
    const selectedValues = useMemo(() => {
        if (value === undefined || value === null) return [];
        return Array.isArray(value) ? value : [value];
    }, [value]);

    const filteredOptions = useMemo(() => {
        return options.filter(option =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            option.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [options, searchQuery]);

    const toggleOpen = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearchQuery('');
            setActiveIndex(-1);
            // Focus search input after a short delay for animation
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleSelect = (option: SearchableSelectOption) => {
        if (option.disabled) return;

        if (multiple) {
            const isSelected = selectedValues.includes(option.value);
            const newValue = isSelected
                ? selectedValues.filter(v => v !== option.value)
                : [...selectedValues, option.value];
            onChange(newValue);
        } else {
            onChange(option.value);
            setIsOpen(false);
        }
    };

    const removeValue = (val: string | number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        const newValue = selectedValues.filter(v => v !== val);
        onChange(newValue);
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                toggleOpen();
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[activeIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll active item into view
    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const activeElement = listRef.current.children[activeIndex] as HTMLElement;
            if (activeElement) {
                activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [activeIndex]);

    const selectedOptions = options.filter(opt => selectedValues.includes(opt.value));

    return (
        <div className={cn("w-full space-y-1.5", className)} ref={containerRef}>
            {label && (
                <label className="text-sm font-medium text-text-muted select-none">
                    {label}
                </label>
            )}

            <div className="relative">
                {/* Control / Trigger */}
                <div
                    onClick={toggleOpen}
                    onKeyDown={handleKeyDown}
                    tabIndex={disabled ? -1 : 0}
                    className={cn(
                        "min-h-[42px] w-full px-3 py-1.5 flex flex-wrap gap-1.5 items-center",
                        "bg-surface border border-border rounded-xl cursor-pointer transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                        isOpen && "ring-2 ring-primary/20 border-primary/50 outline-none shadow-premium",
                        disabled && "opacity-50 cursor-not-allowed bg-surface-hover",
                        error && "border-error focus:ring-error/20 focus:border-error"
                    )}
                >
                    {selectedOptions.length === 0 ? (
                        <span className="text-text-muted text-sm ml-1">{placeholder}</span>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {multiple ? (
                                selectedOptions.map(opt => (
                                    <div
                                        key={opt.value}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-lg border border-primary/20"
                                    >
                                        {opt.label}
                                        <X
                                            size={12}
                                            className="hover:text-primary-dark cursor-pointer"
                                            onClick={(e) => removeValue(opt.value, e)}
                                        />
                                    </div>
                                ))
                            ) : (
                                <span className="text-text text-sm ml-1 font-medium">{selectedOptions[0].label}</span>
                            )}
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-1 pl-2">
                        {selectedValues.length > 0 && !multiple && !disabled && (
                            <X
                                size={14}
                                className="text-text-muted hover:text-error transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(multiple ? [] : '');
                                }}
                            />
                        )}
                        <ChevronDown
                            size={16}
                            className={cn(
                                "text-text-muted transition-transform duration-200",
                                isOpen && "rotate-180"
                            )}
                        />
                    </div>
                </div>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 5, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute z-[100] mt-2 top-full left-0 w-full bg-surface border border-border rounded-xl shadow-premium-lg overflow-hidden glass-morphism"
                        >
                            {/* Search Box */}
                            <div className="p-2 border-b border-border/50 sticky top-0 bg-surface/80 backdrop-blur-md z-10">
                                <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-hover border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
                                        placeholder={searchPlaceholder}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                </div>
                            </div>

                            {/* Options List */}
                            <div
                                className="max-h-[260px] overflow-y-auto p-1 custom-scrollbar"
                                ref={listRef}
                            >
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((option, index) => {
                                        const isSelected = selectedValues.includes(option.value);
                                        const isActive = index === activeIndex;

                                        return (
                                            <div
                                                key={option.value}
                                                onClick={() => handleSelect(option)}
                                                onMouseEnter={() => setActiveIndex(index)}
                                                className={cn(
                                                    "group flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150",
                                                    isActive ? "bg-primary/5 text-primary" : "text-text-muted hover:bg-surface-hover hover:text-text",
                                                    option.disabled && "opacity-50 cursor-not-allowed grayscale"
                                                )}
                                            >
                                                {/* Option Icon */}
                                                {(option.icon || multiple) && (
                                                    <div className="mt-0.5 shrink-0">
                                                        {multiple ? (
                                                            <div className={cn(
                                                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                                isSelected ? "bg-primary border-primary text-white" : "border-border bg-transparent"
                                                            )}>
                                                                {isSelected && <Check size={10} strokeWidth={3} />}
                                                            </div>
                                                        ) : (
                                                            option.icon
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    {renderOption ? (
                                                        renderOption(option)
                                                    ) : (
                                                        <>
                                                            <div className={cn(
                                                                "text-sm font-medium leading-tight truncate",
                                                                isSelected && !multiple && "text-primary"
                                                            )}>
                                                                {option.label}
                                                            </div>
                                                            {option.description && (
                                                                <div className="text-[11px] mt-0.5 line-clamp-1 opacity-70">
                                                                    {option.description}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {!multiple && isSelected && (
                                                    <Check size={14} className="text-primary shrink-0 transition-all scale-100" />
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="px-3 py-8 text-center text-text-muted text-sm italic">
                                        {noOptionsMessage}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {error && (
                <p className="text-xs text-error mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    );
};
