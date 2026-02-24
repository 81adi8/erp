import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonTableProps {
    rows?: number;
    columns?: number;
    className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
    rows = 6,
    columns = 5,
    className = '',
}) => {
    return (
        <div className={`bg-surface rounded-2xl border border-border overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border bg-surface-hover/30">
                            {Array.from({ length: columns }).map((_, i) => (
                                <th key={i} className="px-6 py-4">
                                    <div className="h-4 w-24 bg-border/40 rounded-lg animate-pulse" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                        {Array.from({ length: rows }).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                                {Array.from({ length: columns }).map((_, j) => (
                                    <td key={j} className="px-6 py-4">
                                        <div 
                                            className="h-4 bg-border/30 rounded-lg"
                                            style={{ 
                                                width: `${Math.random() * 40 + 40}%`,
                                                opacity: 1 - (i * 0.1) // Fade effect for deeper rows
                                            }} 
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
