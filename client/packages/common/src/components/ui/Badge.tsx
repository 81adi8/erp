import React, { memo } from 'react';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'danger';
    size?: 'sm' | 'md';
    className?: string;
}

const variantStyles: Record<string, string> = {
    default: 'bg-surface-hover text-text-secondary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    error: 'bg-error/15 text-error',
    danger: 'bg-error/15 text-error',
    info: 'bg-info/15 text-info',
    outline: 'bg-transparent border border-border text-text-secondary',
};

const sizeStyles: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};

export const Badge: React.FC<BadgeProps> = memo(({
    children,
    variant = 'default',
    size = 'sm',
    className = '',
}) => {
    return (
        <span
            className={`
                inline-flex items-center font-medium rounded-full
                ${variantStyles[variant]}
                ${sizeStyles[size]}
                ${className}
            `}
        >
            {children}
        </span>
    );
});
