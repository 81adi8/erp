// Loading Spinner Component
// import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    color?: 'primary' | 'white' | 'current';
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
};

const colorClasses = {
    primary: 'text-primary',
    white: 'text-white',
    current: 'text-current',
};

export function LoadingSpinner({ 
    size = 'md', 
    className = '',
    color = 'primary'
}: LoadingSpinnerProps) {
    return (
        <svg
            className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            role="status"
            aria-label="Loading"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
        </svg>
    );
}

// Also export a full-page loading component
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <LoadingSpinner size="xl" />
            <p className="mt-4 text-muted-foreground">{message}</p>
        </div>
    );
}
