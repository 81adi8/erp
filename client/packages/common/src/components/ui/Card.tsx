import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    children: React.ReactNode;
    variant?: 'default' | 'elevated' | 'outlined' | 'glass';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
}

const variantStyles: Record<string, string> = {
    default: 'bg-surface border border-border',
    elevated: 'bg-surface shadow-lg',
    outlined: 'bg-transparent border-2 border-border',
    glass: 'bg-surface/60 backdrop-blur-md border border-border-light',
};

const paddingStyles: Record<string, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
};

export const Card: React.FC<CardProps> = ({
    children,
    variant = 'default',
    padding = 'md',
    hover = false,
    className = '',
    ...props
}) => {
    return (
        <motion.div
            className={`
                rounded-lg
                ${variantStyles[variant]}
                ${paddingStyles[padding]}
                ${hover ? 'transition-all hover:shadow-md hover:border-primary/30' : ''}
                ${className}
            `}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
    <div className={`mb-4 ${className}`}>{children}</div>
);

export interface CardTitleProps {
    children: React.ReactNode;
    className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => (
    <h3 className={`text-lg font-semibold text-text ${className}`}>{children}</h3>
);

export interface CardDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = '' }) => (
    <p className={`text-sm text-text-muted mt-1 ${className}`}>{children}</p>
);

export interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
    <div className={className}>{children}</div>
);

export interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
    <div className={`mt-4 pt-4 border-t border-border-light ${className}`}>{children}</div>
);
