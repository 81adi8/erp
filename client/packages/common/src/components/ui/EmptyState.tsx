import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className = '',
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col items-center justify-center p-12 text-center bg-surface-hover/30 rounded-2xl border-2 border-dashed border-border/50 ${className}`}
        >
            {Icon && (
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
                    <Icon className="w-8 h-8" />
                </div>
            )}
            <h3 className="text-xl font-semibold text-text mb-2">{title}</h3>
            <p className="text-text-muted max-w-sm mb-8">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="primary" size="lg">
                    {actionLabel}
                </Button>
            )}
        </motion.div>
    );
};
