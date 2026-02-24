import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Filter, 
    ChevronLeft, 
    ChevronRight, 
    Download, 
    Plus,
    RefreshCw
} from 'lucide-react';
import { Table } from './Table';
import type { Column } from './Table';
import { Button } from './Button';
import { Input } from './Input';
import { SkeletonTable } from './SkeletonTable';
import { EmptyState } from './EmptyState';

interface DataTableProps<T> {
    title?: string;
    description?: string;
    data: T[] | undefined;
    columns: Column<T>[];
    loading?: boolean;
    onRefresh?: () => void;
    onAdd?: () => void;
    addLabel?: string;
    onExport?: () => void;
    searchPlaceholder?: string;
    onSearch?: (term: string) => void;
    pagination?: {
        currentPage: number;
        totalPages: number;
        onPageChange: (page: number) => void;
    };
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: React.ReactNode;
    actions?: React.ReactNode;
}

export function DataTable<T>({
    title,
    description,
    data,
    columns,
    loading = false,
    onRefresh,
    onAdd,
    addLabel = 'Add New',
    onExport,
    searchPlaceholder = 'Search...',
    onSearch,
    pagination,
    emptyTitle = 'No data found',
    emptyDescription = 'Try adjusting your search or filters to find what you looking for.',
    emptyIcon,
    actions,
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        onSearch?.(value);
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            {(title || onAdd || onRefresh || onExport || actions) && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        {title && <h2 className="text-2xl font-bold text-text">{title}</h2>}
                        {description && <p className="text-text-muted mt-1">{description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        {onRefresh && (
                            <Button variant="outline" size="sm" onClick={onRefresh} className="shrink-0">
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        )}
                        {onExport && (
                            <Button variant="outline" size="sm" onClick={onExport} className="shrink-0">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        )}
                        {actions}
                        {onAdd && (
                            <Button variant="primary" size="sm" onClick={onAdd} className="shrink-0">
                                <Plus className="w-4 h-4 mr-2" />
                                {addLabel}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-surface p-4 rounded-2xl border border-border">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                        value={searchTerm}
                        onChange={handleSearch}
                        placeholder={searchPlaceholder}
                        className="pl-10 h-10 bg-surface-hover/50"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="w-full md:w-auto">
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </Button>
                </div>
            </div>

            {/* Table Section */}
            <div className="relative">
                {loading ? (
                    <SkeletonTable rows={8} columns={columns.length} />
                ) : !data || data.length === 0 ? (
                    <EmptyState
                        icon={emptyIcon}
                        title={emptyTitle}
                        description={emptyDescription}
                        actionLabel={onAdd ? addLabel : undefined}
                        onAction={onAdd}
                    />
                ) : (
                    <Table
                        data={data}
                        columns={columns}
                        keyExtractor={(item) => {
                            if (typeof item === 'object' && item !== null && 'id' in item) {
                                const id = (item as { id: string | number }).id;
                                return String(id);
                            }
                            return Math.random().toString();
                        }}
                    />
                )}
            </div>

            {/* Pagination Section */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-surface px-6 py-4 rounded-2xl border border-border">
                    <p className="text-sm text-text-muted">
                        Page <span className="font-semibold text-text">{pagination.currentPage}</span> of{' '}
                        <span className="font-semibold text-text">{pagination.totalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.currentPage === 1}
                            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                                const pageNum = i + 1; // Simplistic pagination logic for now
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => pagination.onPageChange(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                            pagination.currentPage === pageNum
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                : 'hover:bg-surface-hover text-text-muted'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {pagination.totalPages > 5 && <span className="px-2">...</span>}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.currentPage === pagination.totalPages}
                            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
