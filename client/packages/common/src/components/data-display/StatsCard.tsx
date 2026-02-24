import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatsCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        label?: string;
    };
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
    loading?: boolean;
    className?: string;
}

const variantStyles: Record<string, { bg: string; iconBg: string; iconColor: string }> = {
    default: {
        bg: 'bg-surface',
        iconBg: 'bg-surface-hover',
        iconColor: 'text-text-secondary',
    },
    primary: {
        bg: 'bg-surface',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
    },
    success: {
        bg: 'bg-surface',
        iconBg: 'bg-success/10',
        iconColor: 'text-success',
    },
    warning: {
        bg: 'bg-surface',
        iconBg: 'bg-warning/10',
        iconColor: 'text-warning',
    },
    error: {
        bg: 'bg-surface',
        iconBg: 'bg-error/10',
        iconColor: 'text-error',
    },
};

export const StatsCard: React.FC<StatsCardProps> = memo(({
    title,
    value,
    icon,
    trend,
    variant = 'default',
    loading = false,
    className = '',
}) => {
    const styles = variantStyles[variant];
    const trendDirection = trend?.value === 0 ? 'neutral' : (trend?.value ?? 0) > 0 ? 'up' : 'down';

    const trendStyles = {
        up: 'text-success bg-success/10',
        down: 'text-error bg-error/10',
        neutral: 'text-text-muted bg-surface-hover',
    };

    const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;

    if (loading) {
        return (
            <div className={`${styles.bg} p-5 rounded-xl border border-border ${className}`}>
                <div className="animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-4 w-24 bg-surface-hover rounded" />
                        <div className="h-10 w-10 bg-surface-hover rounded-lg" />
                    </div>
                    <div className="h-8 w-20 bg-surface-hover rounded mb-2" />
                    <div className="h-4 w-16 bg-surface-hover rounded" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`${styles.bg} p-6 rounded-2xl border border-border hover:shadow-lg transition-all ${className}`}
        >
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-text-muted">{title}</span>
                {icon && (
                    <div className={`p-3 rounded-full ${styles.iconBg} ring-1 ring-inset ring-black/5`}>
                        <span className={styles.iconColor}>{icon}</span>
                    </div>
                )}
            </div>

            <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="text-2xl font-semibold text-text mb-2"
            >
                {value}
            </motion.div>

            {trend && (
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${trendStyles[trendDirection]}`}>
                        <TrendIcon className="w-3 h-3" />
                        {Math.abs(trend.value)}%
                    </span>
                    {trend.label && (
                        <span className="text-xs text-text-muted">{trend.label}</span>
                    )}
                </div>
            )}
        </motion.div>
    );
});
