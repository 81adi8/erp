/**
 * Fees Dashboard Page
 * Shows fee collection summary and quick actions
 */
import { motion } from 'framer-motion';
import { 
    IndianRupee, 
    TrendingUp, 
    Users, 
    Calendar,
    Plus,
    FileText,
    CreditCard,
    AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGetFeeSummaryQuery } from '../../api/feesApi';
import { usePermission } from '../../../../core/rbac';
import { LoadingSpinner } from '@erp/common';

export default function FeesDashboardPage() {
    const { hasPermission } = usePermission();
    const { data: summaryData, isLoading, isError, refetch } = useGetFeeSummaryQuery();

    const summary = summaryData?.data;

    const stats = [
        {
            label: 'Total Collected',
            value: summary?.total_collected || 0,
            icon: <IndianRupee className="w-6 h-6 text-success" />,
            format: 'currency',
            color: 'bg-emerald-50 border-emerald-200'
        },
        {
            label: 'Today\'s Collection',
            value: summary?.today_collection || 0,
            icon: <TrendingUp className="w-6 h-6 text-primary" />,
            format: 'currency',
            color: 'bg-blue-50 border-blue-200'
        },
        {
            label: 'Total Payments',
            value: summary?.total_payments || 0,
            icon: <CreditCard className="w-6 h-6 text-secondary" />,
            format: 'number',
            color: 'bg-purple-50 border-purple-200'
        },
        {
            label: 'Pending',
            value: summary?.pending_count || 0,
            icon: <AlertCircle className="w-6 h-6 text-warning" />,
            format: 'number',
            color: 'bg-amber-50 border-amber-200'
        },
    ];

    const quickActions = [
        {
            label: 'Add Category',
            path: '/fees/categories',
            icon: <Plus className="w-5 h-5" />,
            permission: 'fees.manage'
        },
        {
            label: 'Assign Fee',
            path: '/fees/assign',
            icon: <FileText className="w-5 h-5" />,
            permission: 'fees.manage'
        },
        {
            label: 'Collect Payment',
            path: '/fees/collect',
            icon: <CreditCard className="w-5 h-5" />,
            permission: 'fees.collect'
        },
        {
            label: 'View Dues',
            path: '/fees/dues',
            icon: <Users className="w-5 h-5" />,
            permission: 'fees.view'
        },
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                        <p className="font-medium">Failed to load fee summary</p>
                        <button onClick={refetch} className="text-sm underline mt-1">Try again</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Fee Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage fee categories, collections, and dues
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Current Academic Session</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`rounded-xl p-5 border ${stat.color}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1 text-foreground">
                                    {stat.format === 'currency' 
                                        ? formatCurrency(stat.value as number)
                                        : stat.value
                                    }
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-white/50">
                                {stat.icon}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-border rounded-xl p-6"
            >
                <h2 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickActions.map((action) => {
                        const canAccess = hasPermission(action.permission);
                        return (
                            <Link
                                key={action.label}
                                to={canAccess ? action.path : '#'}
                                onClick={(e) => !canAccess && e.preventDefault()}
                                className={`p-4 rounded-lg border border-border flex flex-col items-center gap-2 transition-all
                                    ${canAccess 
                                        ? 'hover:bg-muted hover:border-primary cursor-pointer' 
                                        : 'opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                <div className="p-2 rounded-lg bg-muted">
                                    {action.icon}
                                </div>
                                <span className="text-sm font-medium text-foreground">{action.label}</span>
                                {!canAccess && (
                                    <span className="text-xs text-muted-foreground">No access</span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </motion.div>

            {/* Recent Activity Placeholder */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card border border-border rounded-xl p-6"
            >
                <h2 className="text-lg font-semibold mb-4 text-foreground">Recent Payments</h2>
                <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Recent payments will appear here</p>
                    <Link 
                        to="/fees/collect" 
                        className="text-primary text-sm hover:underline mt-2 inline-block"
                    >
                        Record a payment →
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}