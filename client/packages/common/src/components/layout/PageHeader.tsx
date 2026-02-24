import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

/**
 * PageHeader Component
 * Reusable header for admin pages with title, description, and optional actions
 */
export interface PageHeaderProps {
    icon: LucideIcon;
    iconColor?: string;
    iconBg?: string;
    title: string;
    description?: string;
    actions?: React.ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    icon: Icon,
    iconColor = 'text-primary',
    iconBg = 'bg-primary/10',
    title,
    description,
    actions,
    className = '',
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${iconBg}`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex items-center gap-3">
                    {actions}
                </div>
            )}
        </motion.div>
    );
};

export default PageHeader;
