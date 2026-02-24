import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
    key: keyof T | string;
    header: string;
    sortable?: boolean;
    width?: string;
    render?: (item: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T) => string;
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
    className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function Table<T>({
    data,
    columns,
    keyExtractor,
    loading = false,
    emptyMessage = 'No data available',
    onRowClick,
    className = '',
}: TableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortKey(null);
                setSortDirection(null);
            }
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const sortedData = React.useMemo(() => {
        if (!sortKey || !sortDirection) return data;

        return [...data].sort((a, b) => {
            const aVal = (a as Record<string, unknown>)[sortKey];
            const bVal = (b as Record<string, unknown>)[sortKey];

            if (aVal === bVal) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            const comparison = aVal < bVal ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [data, sortKey, sortDirection]);

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortKey !== columnKey) {
            return <ChevronsUpDown className="w-4 h-4 text-text-muted" />;
        }
        return sortDirection === 'asc' ? (
            <ChevronUp className="w-4 h-4 text-primary" />
        ) : (
            <ChevronDown className="w-4 h-4 text-primary" />
        );
    };

    if (loading) {
        return (
            <div className={`bg-surface rounded-xl border border-border overflow-hidden ${className}`}>
                <div className="animate-pulse">
                    <div className="border-b border-border p-4 flex gap-4">
                        {columns.map((_, i) => (
                            <div key={i} className="h-4 bg-surface-hover rounded flex-1" />
                        ))}
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-4 flex gap-4 border-b border-border-light last:border-0">
                            {columns.map((_, j) => (
                                <div key={j} className="h-4 bg-surface-hover rounded flex-1" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className={`bg-surface rounded-xl border border-border p-12 text-center ${className}`}>
                <p className="text-text-muted">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={`bg-surface rounded-xl border border-border overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border bg-surface-hover/50">
                            {columns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    className={`
                                        px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider
                                        ${column.sortable ? 'cursor-pointer hover:bg-surface-hover select-none' : ''}
                                    `}
                                    style={{ width: column.width }}
                                    onClick={() => column.sortable && handleSort(String(column.key))}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.header}
                                        {column.sortable && <SortIcon columnKey={String(column.key)} />}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                        {sortedData.map((item, rowIndex) => (
                            <tr
                                key={keyExtractor(item)}
                                className={`
                                    hover:bg-surface-hover/50 transition-colors
                                    ${onRowClick ? 'cursor-pointer' : ''}
                                `}
                                onClick={() => onRowClick?.(item)}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={String(column.key)}
                                        className="px-4 py-3 text-sm text-text"
                                    >
                                        {column.render
                                            ? column.render(item, rowIndex)
                                            : String((item as Record<string, unknown>)[String(column.key)] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
