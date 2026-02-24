// ============================================================================
// Stat Progress Card - Card with value, label, and progress bar
// ============================================================================

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

export interface StatProgressCardProps {
    title: string;
    value: string | number;
    maxValue?: number;
    suffix?: string;
    icon?: LucideIcon;
    trend?: {
        value: number;
        label?: string;
    };
    progressColor?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
    showProgress?: boolean;
    className?: string;
}

const variantStyles = {
    default: { bg: 'bg-surface', iconBg: 'bg-muted', iconColor: 'text-muted-foreground', progressBg: 'bg-primary' },
    primary: { bg: 'bg-surface', iconBg: 'bg-primary/10', iconColor: 'text-primary', progressBg: 'bg-primary' },
    success: { bg: 'bg-surface', iconBg: 'bg-success/10', iconColor: 'text-success', progressBg: 'bg-success' },
    warning: { bg: 'bg-surface', iconBg: 'bg-warning/10', iconColor: 'text-warning', progressBg: 'bg-warning' },
    error: { bg: 'bg-surface', iconBg: 'bg-error/10', iconColor: 'text-error', progressBg: 'bg-error' },
};

export const StatProgressCard: React.FC<StatProgressCardProps> = memo(({
    title,
    value,
    maxValue = 100,
    suffix,
    icon: Icon,
    trend,
    progressColor,
    variant = 'default',
    showProgress = true,
    className = '',
}) => {
    const styles = variantStyles[variant];
    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    const percentage = Math.min(100, Math.max(0, (numericValue / maxValue) * 100));
    const trendDirection = trend?.value === 0 ? 'neutral' : (trend?.value ?? 0) > 0 ? 'up' : 'down';

    const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;
    const trendColors = {
        up: 'text-success bg-success/10',
        down: 'text-error bg-error/10',
        neutral: 'text-muted-foreground bg-muted',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.3 }}
            className={`${styles.bg} p-5 rounded-2xl border border-border hover:shadow-lg transition-all ${className}`}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                {Icon && (
                    <div className={`p-2.5 rounded-xl ${styles.iconBg}`}>
                        <Icon size={18} className={styles.iconColor} />
                    </div>
                )}
            </div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.2 }}
                className="flex items-baseline gap-1 mb-3"
            >
                <span className="text-3xl font-bold text-foreground">{value}</span>
                {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
            </motion.div>

            {showProgress && (
                <div className="space-y-1.5">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${progressColor || styles.progressBg}`}
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{percentage.toFixed(1)}% of {maxValue}</span>
                        {trend && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${trendColors[trendDirection]}`}>
                                <TrendIcon size={12} />
                                {Math.abs(trend.value)}%
                                {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
});

StatProgressCard.displayName = 'StatProgressCard';
