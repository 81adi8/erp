import React, { forwardRef } from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-text mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative flex items-center w-full">
                    {leftIcon && (
                        <span className="absolute left-3 flex items-center justify-center pointer-events-none text-text-muted z-10">
                            {leftIcon}
                        </span>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={clsx(
                            'w-full flex-1 px-4 py-2.5',
                            'bg-surface border border-border rounded-lg',
                            'text-text placeholder:text-text-muted',
                            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-hover',
                            'transition-colors duration-200',
                            leftIcon && 'pl-8',
                            rightIcon && 'pr-8',
                            error && 'border-error focus:ring-error/50 focus:border-error',
                            className
                        )}
                        {...props}
                    />
                    {rightIcon && (
                        <span className="absolute right-3 flex items-center justify-center text-text-muted z-10">
                            {rightIcon}
                        </span>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-error">{error}</p>
                )}
                {hint && !error && (
                    <p className="mt-1.5 text-sm text-text-muted">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
