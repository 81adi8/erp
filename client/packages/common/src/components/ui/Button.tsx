import React, { memo } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';


import {cn} from '../../utils/cn'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const variantStyles: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
    secondary: 'bg-secondary text-white hover:bg-secondary-dark shadow-sm',
    ghost: 'bg-transparent text-text hover:bg-surface-hover',
    danger: 'bg-error text-white hover:bg-error/90 shadow-sm',
    destructive: 'bg-error text-white hover:bg-error/90 shadow-sm',
    outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary/10',
};

const sizeStyles: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
    md: 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
};

export const Button: React.FC<ButtonProps> = memo(({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    return (
        <motion.button
            whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
            whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
            // className={clsx(`inline-flex items-center cursor-pointer justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]}
            //     ${sizeStyles[size]}
            //     ${fullWidth ? 'w-full' : ''}`, className
            // )}


            className={
                cn("inline-flex items-center cursor-pointer justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",variantStyles[variant],
  sizeStyles[size],
  fullWidth && "w-full",
  className)
            }
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                leftIcon
            )}
            {children}
            {!isLoading && rightIcon}
        </motion.button>
    );
});
