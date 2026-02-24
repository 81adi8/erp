/**
 * Collect Payment Page
 * Search student and record fee payment
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, CreditCard, AlertCircle, CheckCircle, Printer } from 'lucide-react';
import { useGetStudentsQuery } from '../../api/studentsApi';
import { useGetStudentPaymentsQuery, useCreateFeePaymentMutation, useGetFeeStructuresQuery } from '../../api/feesApi';
import { usePermission } from '../../../../core/rbac';
import { useAcademicSession } from '../../../../core/hooks/useAcademicSession';
import { LoadingSpinner, Button, Input } from '@erp/common';
import type { FeePayment } from '../../api/feesApi';
import { formatApiError } from '@/common/services/apiHelpers';
import { collectFeeSchema, type CollectFeeFormData } from '@/core/validation/schemas';

export default function CollectPaymentPage() {
    const { hasPermission } = usePermission();
    const { sessionId } = useAcademicSession();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState<FeePayment | null>(null);
    const [formError, setFormError] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CollectFeeFormData>({
        resolver: zodResolver(collectFeeSchema),
        defaultValues: {
            paymentMethod: 'cash',
            paymentDate: new Date().toISOString().split('T')[0],
            transactionRef: '',
            remarks: '',
        },
    });

    const { data: studentsData, isLoading: isSearching } = useGetStudentsQuery(
        { search: searchQuery, limit: 10 },
        { skip: !searchQuery || searchQuery.length < 2 }
    );

    const { data: paymentsData, refetch: refetchPayments } = useGetStudentPaymentsQuery(selectedStudentId || '', {
        skip: !selectedStudentId,
    });

    const { data: structuresData } = useGetFeeStructuresQuery({ academicYear: sessionId || undefined });
    const [createPayment, { isLoading: isPaying }] = useCreateFeePaymentMutation();
    void structuresData;

    const students = studentsData?.data || [];
    const payments = paymentsData?.data || [];
    const canCollect = hasPermission('fees.collect');

    const totalPaid = payments.reduce((sum: number, p: FeePayment) => sum + (p.amount_paid || 0), 0);

    const handleSelectStudent = (studentId: string) => {
        setSelectedStudentId(studentId);
        setSearchQuery('');
        setShowPaymentForm(false);
        setPaymentSuccess(null);
    };

    const handleOpenPaymentForm = () => {
        reset({
            paymentMethod: 'cash',
            paymentDate: new Date().toISOString().split('T')[0],
            transactionRef: '',
            remarks: '',
        });
        setFormError('');
        setShowPaymentForm(true);
    };

    const onSubmitPayment = async (formData: CollectFeeFormData) => {
        if (!selectedStudentId) {
            return;
        }

        try {
            const result = await createPayment({
                studentId: selectedStudentId,
                amountPaid: formData.amountPaid,
                paymentMethod: formData.paymentMethod,
                paymentDate: formData.paymentDate,
                transactionRef: formData.transactionRef || undefined,
                remarks: formData.remarks || undefined,
            }).unwrap();

            setPaymentSuccess(result.data);
            setShowPaymentForm(false);
            refetchPayments();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

    const selectedStudent = students.find((s) => s.id === selectedStudentId);

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Collect Payment</h1>
                <p className="text-muted-foreground text-sm mt-1">Search student and record fee payment</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or admission number..."
                        className="pl-10"
                    />
                </div>
                {isSearching && <div className="mt-2 text-sm text-muted-foreground">Searching...</div>}
                {students.length > 0 && searchQuery.length >= 2 && (
                    <div className="mt-2 border border-border rounded-lg overflow-hidden">
                        {students.slice(0, 5).map((s) => (
                            <button
                                key={s.id}
                                onClick={() => handleSelectStudent(s.id)}
                                className="w-full px-4 py-3 text-left hover:bg-muted flex items-center justify-between"
                            >
                                <span className="font-medium">{s.firstName} {s.lastName}</span>
                                <span className="text-sm text-muted-foreground">{s.className || 'No class'}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedStudentId && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">{selectedStudent?.firstName} {selectedStudent?.lastName}</h2>
                            <p className="text-sm text-muted-foreground">{selectedStudent?.className || 'No class assigned'}</p>
                        </div>
                        <button onClick={() => setSelectedStudentId(null)} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                            <p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Payments</p>
                            <p className="text-xl font-bold">{payments.length}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Last Payment</p>
                            <p className="text-sm font-medium">{payments[0]?.payment_date ? new Date(payments[0].payment_date).toLocaleDateString() : '-'}</p>
                        </div>
                    </div>

                    {paymentSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                                <h3 className="text-lg font-semibold text-emerald-800">Payment Recorded</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div><span className="text-muted-foreground">Receipt No:</span> <span className="font-medium">{paymentSuccess.receipt_number}</span></div>
                                <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{formatCurrency(paymentSuccess.amount_paid)}</span></div>
                                <div><span className="text-muted-foreground">Method:</span> <span className="font-medium capitalize">{paymentSuccess.payment_method}</span></div>
                                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(paymentSuccess.payment_date).toLocaleDateString()}</span></div>
                            </div>
                            <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print Receipt</Button>
                        </div>
                    )}

                    {canCollect && !showPaymentForm && !paymentSuccess && (
                        <Button onClick={handleOpenPaymentForm}><CreditCard className="w-4 h-4 mr-2" />Record Payment</Button>
                    )}

                    {showPaymentForm && (
                        <form onSubmit={handleSubmit(onSubmitPayment)} className="space-y-4 border-t border-border pt-4">
                            <h3 className="font-semibold">Record New Payment</h3>
                            {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{formError}</div>}
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Amount (INR) *"
                                    type="number"
                                    min="1"
                                    placeholder="1000"
                                    {...register('amountPaid')}
                                    error={errors.amountPaid?.message}
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Payment Method</label>
                                    <select
                                        {...register('paymentMethod')}
                                        className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.paymentMethod ? 'border-error' : 'border-input'}`}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="online">Online</option>
                                        <option value="manual">Manual Entry</option>
                                    </select>
                                    {errors.paymentMethod && <p className="text-sm text-error">{errors.paymentMethod.message}</p>}
                                </div>
                                <Input
                                    label="Date"
                                    type="date"
                                    {...register('paymentDate')}
                                    error={errors.paymentDate?.message}
                                />
                                <Input
                                    label="Transaction Ref"
                                    placeholder="Optional"
                                    {...register('transactionRef')}
                                    error={errors.transactionRef?.message}
                                />
                            </div>
                            <Input
                                label="Remarks"
                                placeholder="Optional notes"
                                {...register('remarks')}
                                error={errors.remarks?.message}
                            />
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                                <Button type="submit" disabled={isPaying}>{isPaying ? <><LoadingSpinner size="sm" className="mr-2" />Processing...</> : 'Record Payment'}</Button>
                            </div>
                        </form>
                    )}

                    {payments.length > 0 && (
                        <div className="mt-6 border-t border-border pt-4">
                            <h3 className="font-semibold mb-3">Payment History</h3>
                            <div className="space-y-2">
                                {payments.slice(0, 5).map((p) => (
                                    <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div>
                                            <p className="font-medium">{formatCurrency(p.amount_paid)}</p>
                                            <p className="text-xs text-muted-foreground">{p.receipt_number} - {new Date(p.payment_date).toLocaleDateString()}</p>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 capitalize">{p.payment_method}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
