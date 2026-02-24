// ============================================================================
// Attendance Status Badge - Reusable badge for attendance status display
// ============================================================================

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, Ban, LucideIcon } from 'lucide-react';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'holiday' | 'not_marked';

export interface AttendanceStatusBadgeProps {
    status: AttendanceStatus;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    showIcon?: boolean;
    animated?: boolean;
    className?: string;
}

interface StatusConfig {
    label: string;
    icon: LucideIcon;
    bgColor: string;
    textColor: string;
    borderColor: string;
}

const statusConfigs: Record<AttendanceStatus, StatusConfig> = {
    present: {
        label: 'Present',
        icon: Check,
        bgColor: 'bg-success/10',
        textColor: 'text-success',
        borderColor: 'border-success/30',
    },
    absent: {
        label: 'Absent',
        icon: X,
        bgColor: 'bg-error/10',
        textColor: 'text-error',
        borderColor: 'border-error/30',
    },
    late: {
        label: 'Late',
        icon: Clock,
        bgColor: 'bg-warning/10',
        textColor: 'text-warning',
        borderColor: 'border-warning/30',
    },
    excused: {
        label: 'Excused',
        icon: Ban,
        bgColor: 'bg-info/10',
        textColor: 'text-info',
        borderColor: 'border-info/30',
    },
    holiday: {
        label: 'Holiday',
        icon: Ban,
        bgColor: 'bg-purple-500/10',
        textColor: 'text-purple-500',
        borderColor: 'border-purple-500/30',
    },
    not_marked: {
        label: 'Not Marked',
        icon: Clock,
        bgColor: 'bg-muted',
        textColor: 'text-muted-foreground',
        borderColor: 'border-border',
    },
};

const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
};

const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
};

export const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = memo(({
    status,
    size = 'md',
    showLabel = true,
    showIcon = true,
    animated = true,
    className = '',
}) => {
    const config = statusConfigs[status];
    const Icon = config.icon;

    const Component = animated ? motion.span : 'span';
    const animationProps = animated ? {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        whileHover: { scale: 1.05 },
        transition: { duration: 0.2 },
    } : {};

    return (
        <Component
            {...animationProps}
            className={`
                inline-flex items-center font-medium rounded-full
                border ${config.bgColor} ${config.textColor} ${config.borderColor}
                ${sizeClasses[size]}
                ${className}
            `}
        >
            {showIcon && <Icon size={iconSizes[size]} />}
            {showLabel && <span>{config.label}</span>}
        </Component>
    );
});

AttendanceStatusBadge.displayName = 'AttendanceStatusBadge';
