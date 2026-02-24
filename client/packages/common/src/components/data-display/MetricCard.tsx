// ============================================================================
// Metric Card - Compact animated metric display card
// ============================================================================

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

export interface MetricCardProps {
    label: string;
    value: string | number;
    icon?: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    description?: string;
    onClick?: () => void;
    className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = memo(({
    label,
    value,
    icon: Icon,
    iconColor = 'text-primary',
    iconBgColor = 'bg-primary/10',
    trend,
    trendValue,
    description,
    onClick,
    className = '',
}) => {
    const trendColors = {
        up: 'text-success',
        down: 'text-error',
        neutral: 'text-muted-foreground',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={onClick ? { y: -2, scale: 1.01 } : undefined}
            whileTap={onClick ? { scale: 0.99 } : undefined}
            onClick={onClick}
            className={`
                p-4 bg-muted/30 rounded-xl
                ${onClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                transition-all duration-200
                ${className}
            `}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={`p-2 rounded-lg ${iconBgColor} ring-1 ring-inset ring-black/5`}>
                            <Icon size={16} className={iconColor} />
                        </div>
                    )}
                    <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <div className="flex items-baseline gap-2">
                            <motion.p
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-xl font-bold text-foreground"
                            >
                                {value}
                            </motion.p>
                            {trend && trendValue && (
                                <span className={`text-xs font-medium ${trendColors[trend]}`}>
                                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

MetricCard.displayName = 'MetricCard';
