import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    disabled?: boolean;
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 200,
    disabled = false,
    className,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-surface-hover border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-surface-hover border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-surface-hover border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-surface-hover border-y-transparent border-l-transparent',
    };

    const motionVariants = {
        top: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } },
        bottom: { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } },
        left: { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 } },
        right: { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 } },
    };

    return (
        <div
            ref={containerRef}
            className="relative inline-flex"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            <AnimatePresence>
                {isVisible && !disabled && (
                    <motion.div
                        className={clsx(
                            'absolute z-50 px-3 py-2',
                            'bg-surface-hover text-text text-sm',
                            'rounded-lg shadow-lg',
                            'whitespace-nowrap',
                            positionClasses[position],
                            className
                        )}
                        initial={motionVariants[position].initial}
                        animate={motionVariants[position].animate}
                        exit={motionVariants[position].initial}
                        transition={{ duration: 0.15 }}
                    >
                        {content}
                        <span
                            className={clsx(
                                'absolute w-0 h-0 border-4',
                                arrowClasses[position]
                            )}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

Tooltip.displayName = 'Tooltip';
