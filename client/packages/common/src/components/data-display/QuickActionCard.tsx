// ============================================================================
// Quick Action Card - Reusable compact card for quick actions
// ============================================================================

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

export interface QuickActionCardProps {
    label: string;
    icon: LucideIcon;
    onClick?: () => void;
    color?: string;
    bgColor?: string;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = memo(({
    label,
    icon: Icon,
    onClick,
    color = 'text-primary',
    bgColor = 'bg-primary/10',
    disabled = false,
    loading = false,
    className = '',
}) => {
    return (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={!disabled ? { y: -3, scale: 1.02 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            onClick={disabled ? undefined : onClick}
            disabled={disabled || loading}
            className={`
                p-4 bg-surface border border-border rounded-xl
                flex flex-col items-center gap-3
                hover:shadow-md hover:border-primary/30
                transition-all duration-200 group
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `}
        >
            <motion.div
                className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center`}
                whileHover={!disabled ? { rotate: 12 } : undefined}
                transition={{ type: 'spring', stiffness: 300 }}
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Icon size={20} className={color} />
                )}
            </motion.div>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {label}
            </span>
        </motion.button>
    );
});

QuickActionCard.displayName = 'QuickActionCard';
