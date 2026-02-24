// ============================================================================
// Progress Ring - Animated circular progress indicator
// ============================================================================

import React, { memo } from 'react';
import { motion } from 'framer-motion';

export interface ProgressRingProps {
    value: number;
    maxValue?: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    strokeWidth?: number;
    showValue?: boolean;
    label?: string;
    color?: string;
    trackColor?: string;
    className?: string;
}

const sizeConfig = {
    sm: { dimension: 48, strokeWidth: 4, fontSize: 'text-xs' },
    md: { dimension: 64, strokeWidth: 5, fontSize: 'text-sm' },
    lg: { dimension: 80, strokeWidth: 6, fontSize: 'text-base' },
    xl: { dimension: 120, strokeWidth: 8, fontSize: 'text-2xl' },
};

export const ProgressRing: React.FC<ProgressRingProps> = memo(({
    value,
    maxValue = 100,
    size = 'md',
    strokeWidth: customStrokeWidth,
    showValue = true,
    label,
    color = 'stroke-primary',
    trackColor = 'stroke-muted',
    className = '',
}) => {
    const config = sizeConfig[size];
    const strokeWidth = customStrokeWidth || config.strokeWidth;
    const radius = (config.dimension - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className={`relative inline-flex flex-col items-center ${className}`}>
            <svg
                width={config.dimension}
                height={config.dimension}
                className="transform -rotate-90"
            >
                {/* Background track */}
                <circle
                    className={trackColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    r={radius}
                    cx={config.dimension / 2}
                    cy={config.dimension / 2}
                />
                {/* Progress circle */}
                <motion.circle
                    className={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    fill="none"
                    r={radius}
                    cx={config.dimension / 2}
                    cy={config.dimension / 2}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ strokeDasharray: circumference }}
                />
            </svg>
            {showValue && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        className={`font-bold text-foreground ${config.fontSize}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                    >
                        {Math.round(percentage)}%
                    </motion.span>
                </div>
            )}
            {label && (
                <span className="mt-2 text-xs text-muted-foreground text-center">{label}</span>
            )}
        </div>
    );
});

ProgressRing.displayName = 'ProgressRing';
