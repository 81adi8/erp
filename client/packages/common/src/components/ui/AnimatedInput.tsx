import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    variant?: 'default' | 'floating';
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
    ({
        label,
        error,
        hint,
        leftIcon,
        rightIcon,
        className = '',
        id,
        variant = 'floating',
        value,
        placeholder,
        onFocus,
        onBlur,
        ...props
    }, ref) => {
        const [isFocused, setIsFocused] = useState(false);
        const [hasValue, setHasValue] = useState(!!value);
        const inputId = id || `animated-input-${Math.random().toString(36).substr(2, 9)}`;

        const isFloating = variant === 'floating';
        const shouldFloat = isFocused || hasValue || !!value;

        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            onFocus?.(e);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            setHasValue(!!e.target.value);
            onBlur?.(e);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setHasValue(!!e.target.value);
            props.onChange?.(e);
        };

        return (
            <div className="w-full">
                <div className="relative">
                    {/* Left Icon */}
                    {leftIcon && (
                        <motion.span
                            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-text-muted z-10"
                            animate={{
                                color: isFocused ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                scale: isFocused ? 1.1 : 1
                            }}
                            transition={{ duration: 0.2 }}
                        >
                            {leftIcon}
                        </motion.span>
                    )}

                    {/* Input Field with Animated Wrapper */}
                    <motion.div
                        animate={{
                            boxShadow: isFocused
                                ? error
                                    ? '0 0 0 3px rgba(239, 68, 68, 0.2)'
                                    : '0 0 0 3px rgba(59, 130, 246, 0.2)'
                                : '0 0 0 0px transparent'
                        }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl"
                    >
                        <input
                            ref={ref}
                            id={inputId}
                            value={value}
                            placeholder={isFloating ? (shouldFloat ? placeholder : '') : placeholder}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onChange={handleChange}
                            className={clsx(
                                'w-full px-4 py-3',
                                'bg-surface border-2 rounded-xl',
                                'text-text placeholder:text-text-muted',
                                'focus:outline-none',
                                'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-hover',
                                'transition-colors duration-200',
                                leftIcon && 'pl-10',
                                rightIcon && 'pr-10',
                                isFloating && label && 'pt-5 pb-2',
                                error
                                    ? 'border-error focus:border-error'
                                    : 'border-border focus:border-primary',
                                className
                            )}
                            {...props}
                        />
                    </motion.div>

                    {/* Floating Label */}
                    {isFloating && label && (
                        <motion.label
                            htmlFor={inputId}
                            className={clsx(
                                'absolute pointer-events-none',
                                'transition-colors duration-200',
                                leftIcon ? 'left-10' : 'left-4',
                                error ? 'text-error' : isFocused ? 'text-primary' : 'text-text-muted'
                            )}
                            initial={false}
                            animate={{
                                top: shouldFloat ? '0.5rem' : '50%',
                                y: shouldFloat ? 0 : '-50%',
                                fontSize: shouldFloat ? '0.75rem' : '1rem',
                                fontWeight: shouldFloat ? 500 : 400,
                            }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            {label}
                        </motion.label>
                    )}

                    {/* Non-floating Label */}
                    {!isFloating && label && (
                        <label
                            htmlFor={inputId}
                            className="block text-sm font-medium text-text mb-1.5"
                        >
                            {label}
                        </label>
                    )}

                    {/* Right Icon */}
                    {rightIcon && (
                        <motion.span
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-text-muted z-10"
                            animate={{
                                color: isFocused ? 'var(--color-primary)' : 'var(--color-text-muted)'
                            }}
                            transition={{ duration: 0.2 }}
                        >
                            {rightIcon}
                        </motion.span>
                    )}
                </div>

                {/* Error Message */}
                <AnimatePresence mode="wait">
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="mt-1.5 text-sm text-error flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* Hint */}
                {hint && !error && (
                    <p className="mt-1.5 text-sm text-text-muted">{hint}</p>
                )}
            </div>
        );
    }
);

AnimatedInput.displayName = 'AnimatedInput';
