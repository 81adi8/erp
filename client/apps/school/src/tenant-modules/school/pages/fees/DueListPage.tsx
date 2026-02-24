/**
 * Due List Page
 * Show students with pending fees
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Filter, Users, IndianRupee, Download } from 'lucide-react';
import { useGetFeePaymentsQuery } from '../../api/feesApi';
import { usePermission } from '../../../../core/rbac';
import { LoadingSpinner, Button } from '@erp/common';

export default function DueListPage() {
    const { hasPermission } = usePermission();
    const [filters, setFilters] = useState({ status: 'pending', from: '', to: '' });

    const { data: paymentsData, isLoading, isError, refetch } = useGetFeePaymentsQuery({
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
    });

    const payments = paymentsData?.data || [];
    const canView = hasPermission('fees.view');

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

    const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    if (!canView) {
        return (
            <div className="p-6">
                <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p>You don't have permission to view dues.</p>
                </div>
            </div>
        );
    }

    if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

    if (isError) return (
        <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <div><p className="font-medium">Failed to load dues</p><button onClick={refetch} className="text-sm underline mt-1">Try again</button></div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Fee Dues</h1>
                    <p className="text-muted-foreground text-sm mt-1">Students with pending fee payments</p>
                </div>
                <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-700">Total Pending</p>
                            <p className="text-2xl font-bold text-amber-800">{formatCurrency(totalPending)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-100"><IndianRupee className="w-6 h-6 text-amber-600" /></div>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Students with Dues</p>
                            <p className="text-2xl font-bold">{payments.filter(p => p.status === 'pending').length}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted"><Users className="w-6 h-6 text-muted-foreground" /></div>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Records</p>
                            <p className="text-2xl font-bold">{payments.length}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted"><Filter className="w-6 h-6 text-muted-foreground" /></div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Status</label>
                        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="h-9 px-3 rounded-lg border border-input bg-background text-sm">
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">From</label>
                        <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="h-9 px-3 rounded-lg border border-input bg-background text-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">To</label>
                        <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="h-9 px-3 rounded-lg border border-input bg-background text-sm" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl overflow-hidden">
                {payments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <IndianRupee className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No dues found</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Student</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Method</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {payments.map((p) => (
                                <tr key={p.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-foreground">{p.student_name || 'Unknown'}</p>
                                            <p className="text-xs text-muted-foreground">{p.receipt_number}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{formatCurrency(p.amount_paid)}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-sm">{new Date(p.payment_date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-sm capitalize">{p.payment_method}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </motion.div>
        </div>
    );
}