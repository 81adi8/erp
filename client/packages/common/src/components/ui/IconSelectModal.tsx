import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Badge } from './Badge';
import { DynamicIcon } from '../../utils/dynamic-icons';
import { getUniqueIconNames, IconCategories, iconMap } from '../../utils/icons';

interface IconSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (iconName: string) => void;
    selectedIcon?: string;
    /** Optional: filter by specific categories */
    categories?: (keyof typeof IconCategories)[];
    /** Optional: restrictive list of icon names to show */
    iconNames?: string[];
    title?: string;
}

export const IconSelectModal: React.FC<IconSelectModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedIcon,
    categories,
    iconNames,
    title = 'Select Icon'
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | keyof typeof IconCategories>('all');

    // Get the base list of icons to show
    const baseIcons = useMemo(() => {
        if (iconNames && iconNames.length > 0) {
            return iconNames;
        }

        if (categories && categories.length > 0) {
            const categorizedIcons = new Set<string>();
            categories.forEach(cat => {
                const icons = IconCategories[cat] || [];
                icons.forEach(icon => categorizedIcons.add(icon));
            });
            return Array.from(categorizedIcons);
        }

        return getUniqueIconNames();
    }, [iconNames, categories]);

    // Filter by search and category
    const filteredIcons = useMemo(() => {
        let result = baseIcons;

        // Apply category filter if 'all' is not selected
        if (activeCategory !== 'all') {
            const categoryIcons = IconCategories[activeCategory] || [];
            result = result.filter(icon => categoryIcons.includes(icon));
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(icon => {
                // Check name
                if (icon.toLowerCase().includes(query)) return true;

                // Check aliases/tags in iconMap (if searchable by other terms)
                // This is a bit slow but helpful
                return Object.entries(iconMap).some(([alias, component]) => {
                    const componentName = component.name || '';
                    return componentName === icon && alias.toLowerCase().includes(query);
                });
            });
        }

        return result;
    }, [baseIcons, activeCategory, searchQuery]);

    const handleSelect = (iconName: string) => {
        onSelect(iconName);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="3xl"
        >
            <div className="space-y-6">
                {/* Search and Categories */}
                <div className="space-y-4">
                    <Input
                        placeholder="Search icons by name or tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<Search size={18} />}
                        className="h-11"
                    />

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeCategory === 'all'
                                    ? 'bg-primary text-white'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                        >
                            All Icons
                        </button>
                        {Object.keys(IconCategories).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${activeCategory === cat
                                        ? 'bg-primary text-white'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Icons Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredIcons.map((iconName) => (
                        <button
                            key={iconName}
                            type="button"
                            onClick={() => handleSelect(iconName)}
                            className={`
                                flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 group
                                ${selectedIcon === iconName
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground'
                                }
                            `}
                            title={iconName}
                        >
                            <div className="p-2 rounded-lg bg-background group-hover:scale-110 transition-transform">
                                <DynamicIcon name={iconName} size={20} />
                            </div>
                            <span className="text-[10px] truncate w-full text-center font-medium">
                                {iconName}
                            </span>
                        </button>
                    ))}

                    {filteredIcons.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground">
                            <X size={32} className="mx-auto mb-2 opacity-20" />
                            <p>No icons found matching your criteria</p>
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <div className="flex-1 text-sm text-muted-foreground">
                        Showing {filteredIcons.length} icons
                    </div>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </ModalFooter>
            </div>
        </Modal>
    );
};
