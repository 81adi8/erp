import React from 'react';

export interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text',
    width,
    height,
    animation = 'pulse',
}) => {
    const variantStyles: Record<string, string> = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    const animationStyles: Record<string, string> = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer',
        none: '',
    };

    const style: React.CSSProperties = {
        width: width || (variant === 'circular' ? '40px' : '100%'),
        height: height || (variant === 'text' ? '1em' : variant === 'circular' ? '40px' : '100px'),
    };

    return (
        <div
            className={`
                bg-surface-hover
                ${variantStyles[variant]}
                ${animationStyles[animation]}
                ${className}
            `}
            style={style}
        />
    );
};

// Preset skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 3,
    className = '',
}) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                variant="text"
                width={i === lines - 1 ? '70%' : '100%'}
                height="0.875rem"
            />
        ))}
    </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`p-5 bg-surface rounded-lg border border-border ${className}`}>
        <div className="flex items-center gap-3 mb-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1">
                <Skeleton variant="text" width="60%" height="1rem" />
                <Skeleton variant="text" width="40%" height="0.75rem" className="mt-1" />
            </div>
        </div>
        <SkeletonText lines={2} />
    </div>
);

