/**
 * Fees View Page
 * Shows child's fee details and payment history
 */
import { motion } from 'framer-motion';
import { IndianRupee, CheckCircle, Clock, AlertCircle, Receipt } from 'lucide-react';
import { useParent } from '../context/ParentContext';
import { useGetChildFeesQuery } from '../../../api/parentPortalApi';
import { LoadingSpinner } from '@erp/common';

export default function FeesViewPage() {
    const { selectedChild } = useParent();
    const childId = selectedChild?.id || '';

    const { data: feesData, isLoading, isError } = useGetChildFeesQuery(childId, { skip: !childId });

    const fees = feesData?.data || [];

    // Calculate stats
    const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount_paid, 0);
    const totalPending = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount_paid, 0);
    const paidCount = fees.filter(f => f.status === 'paid').length;
    const pendingCount = fees.filter(f => f.status === 'pending').length;

    const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

    if (!selectedChild) {
        return <div className="text-center py-8 text-muted-foreground">No child selected</div>;
    }

    if (isLoading) {
        return <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>;
    }

    if (isError) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center">
                Failed to load fee data. You may not have permission to view fees.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm text-emerald-700">Total Paid</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totalPaid)}</p>
                    <p className="text-xs text-emerald-600 mt-1">{paidCount} payments</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-amber-600" />
                        <span className="text-sm text-amber-700">Pending</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-800">{formatCurrency(totalPending)}</p>
                    <p className="text-xs text-amber-600 mt-1">{pendingCount} pending</p>
                </motion.div>
            </div>

            {/* Payment Progress */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-xl p-4"
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Payment Progress</span>
                    <span className="text-sm text-muted-foreground">
                        {fees.length > 0 ? Math.round((paidCount / fees.length) * 100) : 0}% complete
                    </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${fees.length > 0 ? (paidCount / fees.length) * 100 : 0}%` }}
                    />
                </div>
            </motion.div>

            {/* Fee List */}
            {fees.length > 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-card border border-border rounded-xl overflow-hidden"
                >
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Payment History</h3>
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="divide-y divide-border">
                        {fees.map((fee) => (
                            <div key={fee.id} className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="font-medium text-foreground text-sm">
                                            {fee.fee_name || 'Fee Payment'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {fee.academic_year && `${fee.academic_year} • `}
                                            {new Date(fee.payment_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-foreground">{formatCurrency(fee.amount_paid)}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            fee.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                                            fee.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {fee.status}
                                        </span>
                                    </div>
                                </div>
                                {fee.status === 'paid' && fee.receipt_number && (
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                                        <span className="text-xs text-muted-foreground">Receipt: {fee.receipt_number}</span>
                                        <span className="text-xs text-muted-foreground capitalize">{fee.payment_method}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <IndianRupee className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No fee records found</p>
                </div>
            )}

            {/* Help Note */}
            <div className="bg-muted/50 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">
                    For fee-related queries, please contact the school office.
                </p>
            </div>
        </div>
    );
}
