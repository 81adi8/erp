// ============================================================================
// Module Dashboard Card - Reusable card for module navigation
// ============================================================================

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

export interface ModuleDashboardCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    onClick?: () => void;
    color?: string;
    bgColor?: string;
    gradient?: string;
    borderColor?: string;
    badge?: React.ReactNode;
    stats?: {
        label: string;
        value: string | number;
    };
    className?: string;
}

export const ModuleDashboardCard: React.FC<ModuleDashboardCardProps> = memo(({
    title,
    description,
    icon: Icon,
    onClick,
    color = 'text-primary',
    bgColor = 'bg-primary/10',
    gradient = 'from-primary/10 to-transparent',
    borderColor = 'border-primary/20',
    badge,
    stats,
    className = '',
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.2 }}
        >
            <div
                onClick={onClick}
                className={`
                    p-5 rounded-2xl cursor-pointer
                    bg-gradient-to-br ${gradient}
                    border ${borderColor}
                    hover:shadow-lg transition-all duration-300
                    group
                    ${className}
                `}
            >
                {/* Icon & Badge */}
                <div className="flex items-start justify-between mb-4">
                    <motion.div
                        className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}
                        whileHover={{ rotate: 8, scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <Icon size={24} className={color} />
                    </motion.div>
                    {badge && <div>{badge}</div>}
                </div>

                {/* Content */}
                <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                    {description}
                </p>

                {/* Stats (optional) */}
                {stats && (
                    <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{stats.label}</span>
                            <span className="text-sm font-semibold text-foreground">{stats.value}</span>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center group-hover:text-primary transition-colors">
                        Open Dashboard
                        <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </motion.div>
    );
});

ModuleDashboardCard.displayName = 'ModuleDashboardCard';
