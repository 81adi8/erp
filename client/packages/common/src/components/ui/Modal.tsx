import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useBlocker } from 'react-router-dom';
import { cn } from '../../utils/cn'

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
    showCloseButton?: boolean;
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;
    preventNavigation?: boolean;
    preventReload?: boolean;
    className?: string;
}

// Width styles for different sizes
const sizeStyles: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    'full': 'max-w-[95vw]',
};

// Max height based on size - larger modals get more height
const heightStyles: Record<string, string> = {
    sm: 'max-h-[80vh] sm:max-h-[60vh]',
    md: 'max-h-[80vh] sm:max-h-[70vh]',
    lg: 'max-h-[85vh] sm:max-h-[75vh]',
    xl: 'max-h-[85vh] sm:max-h-[78vh]',
    '2xl': 'max-h-[90vh] sm:max-h-[80vh]',
    '3xl': 'max-h-[90vh] sm:max-h-[82vh]',
    '4xl': 'max-h-[92vh] sm:max-h-[84vh]',
    '5xl': 'max-h-[92vh] sm:max-h-[85vh]',
    '6xl': 'max-h-[94vh] sm:max-h-[86vh]',
    'full': 'max-h-[95vh]',
};

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOutsideClick = false,
    closeOnEscape = true,
    preventNavigation = true,
    preventReload = true,
    className = ""
}) => {
    // Separate component to safely use useBlocker only when needed
    // This prevents crashing in apps not using Data Router if preventNavigation is true
    const NavigationBlocker = () => {
        const blocker = useBlocker(
            ({ currentLocation, nextLocation }) =>
                isOpen && preventNavigation && currentLocation.pathname !== nextLocation.pathname
        );

        useEffect(() => {
            if (blocker.state === 'blocked') {
                if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                    blocker.proceed();
                } else {
                    blocker.reset();
                }
            }
        }, [blocker]);

        return null;
    };

    /**
     * Simple Error Boundary to catch React Router "Data Router" errors
     * This allows the Modal to be used in older BrowserRouter apps without crashing
     */
    class SafeBlocker extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
        constructor(props: { children: React.ReactNode }) {
            super(props);
            this.state = { hasError: false };
        }
        static getDerivedStateFromError() { return { hasError: true }; }
        render() {
            if (this.state.hasError) return null;
            return this.props.children;
        }
    }

    // Prevent reload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isOpen && preventReload) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        if (isOpen && preventReload) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isOpen, preventReload]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && closeOnEscape) onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, closeOnEscape]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
                    {/* Navigation Blocker (Only works in Data Routers) */}
                    <SafeBlocker>
                        {preventNavigation && <NavigationBlocker />}
                    </SafeBlocker>

                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closeOnOutsideClick ? onClose : undefined}
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={cn(
                            // Base styles
                            "relative w-full flex flex-col overflow-hidden",
                            // Visual styles
                            "bg-surface rounded-2xl shadow-2xl",
                            "border border-border/60",
                            // Size constraints
                            sizeStyles[size] || sizeStyles.md,
                            heightStyles[size] || heightStyles.md,
                            className
                        )}
                    >
                        {/* Header - Always sticky at top */}
                        {(title || showCloseButton) && (
                            <div className="flex-shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-border/50 bg-surface z-20">
                                <div className="flex-1 min-w-0">
                                    {title && (
                                        <h2 className="text-lg font-bold tracking-tight text-foreground truncate">
                                            {title}
                                        </h2>
                                    )}
                                    {description && (
                                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                            {description}
                                        </p>
                                    )}
                                </div>
                                {showCloseButton && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-shrink-0 p-2 -mr-2 -mt-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-200"
                                        aria-label="Close modal"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Content - Scrollable area */}
                        <div 
                            className={cn(
                                "flex-1 overflow-y-auto overflow-x-hidden relative",
                                // Custom scrollbar styling
                                "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
                                "hover:scrollbar-thumb-muted-foreground/30"
                            )}
                        >
                            <div className="px-6 py-5">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => (
    <div className={cn(
        "flex items-center justify-end gap-3",
        "pt-5 mt-6 border-t border-border/50",
        // Sticky footer effect - sticks to the bottom of the scrollable area
        "sticky bottom-0 -mb-5 -mx-6 px-6 pb-5",
        "bg-surface/95 backdrop-blur-sm z-10",
        className
    )}>
        {children}
    </div>
);
