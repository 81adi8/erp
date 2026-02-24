import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './Button';
import type { ButtonProps } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    isLoading = false,
}) => {
    const variantColors = {
        danger: 'bg-error/10 text-error',
        warning: 'bg-warning/10 text-warning',
        info: 'bg-primary/10 text-primary',
    };

    const confirmVariants: Record<NonNullable<ConfirmDialogProps['variant']>, ButtonProps['variant']> = {
        danger: 'danger',
        warning: 'secondary',
        info: 'primary',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${variantColors[variant]}`}>
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="text-xl font-bold text-text truncate">
                                        {title}
                                    </h3>
                                    <p className="mt-2 text-text-muted leading-relaxed">
                                        {description}
                                    </p>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="p-1 hover:bg-surface-hover rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-text-muted" />
                                </button>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={isLoading}
                                >
                                    {cancelLabel}
                                </Button>
                                <Button
                                    variant={confirmVariants[variant]}
                                    onClick={onConfirm}
                                    isLoading={isLoading}
                                >
                                    {confirmLabel}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
