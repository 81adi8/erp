/**
 * Fee Receipt Component
 * Print-friendly receipt for fee payments
 */
import { Printer, CheckCircle } from 'lucide-react';
import type { FeePayment } from '../../api/feesApi';

interface FeeReceiptProps {
    payment: FeePayment;
    schoolName?: string;
    studentName?: string;
    onClose?: () => void;
}

export default function FeeReceipt({ payment, schoolName = 'School Name', studentName, onClose }: FeeReceiptProps) {
    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white print:bg-white print:shadow-none print:border-none">
            {/* Screen Header - Hidden on print */}
            <div className="print:hidden flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Payment Recorded Successfully</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted">
                            Close
                        </button>
                    )}
                </div>
            </div>

            {/* Receipt Content */}
            <div className="border border-border rounded-xl p-6 print:border print:rounded-none print:p-8 max-w-md mx-auto">
                {/* Header */}
                <div className="text-center border-b border-border pb-4 mb-4">
                    <h1 className="text-xl font-bold text-foreground">{schoolName}</h1>
                    <p className="text-sm text-muted-foreground">Fee Receipt</p>
                </div>

                {/* Receipt Details */}
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Receipt No:</span>
                        <span className="font-medium font-mono">{payment.receipt_number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">{new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Student:</span>
                        <span className="font-medium">{studentName || payment.student_name || 'N/A'}</span>
                    </div>
                    {payment.fee_name && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Fee:</span>
                            <span className="font-medium">{payment.fee_name}</span>
                        </div>
                    )}
                </div>

                {/* Amount Section */}
                <div className="border-t border-b border-border py-4 my-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Amount Paid:</span>
                        <span className="text-2xl font-bold text-success">{formatCurrency(payment.amount_paid)}</span>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Method:</span>
                        <span className="font-medium capitalize">{payment.payment_method}</span>
                    </div>
                    {payment.transaction_ref && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Transaction Ref:</span>
                            <span className="font-medium font-mono text-xs">{payment.transaction_ref}</span>
                        </div>
                    )}
                    {payment.remarks && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Remarks:</span>
                            <span className="font-medium">{payment.remarks}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground">This is a computer-generated receipt.</p>
                    <p className="text-xs text-muted-foreground mt-1">For any queries, please contact the school office.</p>
                </div>

                {/* Signature Area */}
                <div className="mt-8 pt-4 flex justify-between">
                    <div className="text-center">
                        <div className="border-t border-border w-32 pt-2">
                            <span className="text-xs text-muted-foreground">Received by</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-border w-32 pt-2">
                            <span className="text-xs text-muted-foreground">Authorized Sign</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}