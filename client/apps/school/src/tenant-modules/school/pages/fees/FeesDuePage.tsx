import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    CreditCard,
    IndianRupee,
    Percent,
    Search,
} from 'lucide-react';
import { Button, Card, Input, LoadingSpinner, Modal } from '@erp/common';
import {
    useApplyDiscountMutation,
    useGetFeeDuesQuery,
    useGetFeePaymentsQuery,
    useGetFeeSummaryQuery,
} from '../../api/feesApi';
import { useGetStudentsQuery } from '../../api/studentsApi';
import { useGetClassesQuery, useGetSectionsQuery } from '../../../../core/api/endpoints/academicsApi';
import { useAcademicSession } from '../../../../core/hooks/useAcademicSession';
import { formatApiError } from '@/common/services/apiHelpers';

type PaymentStatus = 'paid' | 'pending' | 'failed' | 'success' | 'refunded';

interface StudentDueRow {
    studentId: string;
    studentName: string;
    className: string;
    sectionName: string;
    totalFee: number;
    paid: number;
    outstanding: number;
    daysOverdue: number;
}

const discountSchema = z.object({
    feeStructureId: z.string().min(1, 'Fee item is required'),
    discountMode: z.enum(['amount', 'percentage']),
    discountValue: z.coerce.number().positive('Discount value must be greater than 0'),
    reason: z.string().min(1, 'Reason is required'),
});

type DiscountFormData = z.infer<typeof discountSchema>;

function getStatusValue(status: string | undefined): PaymentStatus {
    const normalized = status?.toLowerCase();
    if (normalized === 'success') return 'success';
    if (normalized === 'pending') return 'pending';
    if (normalized === 'failed') return 'failed';
    if (normalized === 'refunded') return 'refunded';
    return 'paid';
}

function daysSince(dateString: string): number {
    const time = new Date(dateString).getTime();
    if (Number.isNaN(time)) return 0;
    const diff = Date.now() - time;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function FeesDuePage() {
    const navigate = useNavigate();
    const { sessionId } = useAcademicSession();

    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [academicYearId, setAcademicYearId] = useState(sessionId || '');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [discountError, setDiscountError] = useState('');
    const [pageMessage, setPageMessage] = useState('');

    const { data: classesResponse } = useGetClassesQuery({ limit: 100 });
    const { data: sectionsResponse } = useGetSectionsQuery({ classId: classId || undefined }, { skip: !classId });

    const { data: studentsResponse, isLoading: isLoadingStudents } = useGetStudentsQuery({
        search: search || undefined,
        classId: classId || undefined,
        limit: 200,
    });
    const { data: paymentsResponse, isLoading: isLoadingPayments } = useGetFeePaymentsQuery({});
    const { data: summaryResponse } = useGetFeeSummaryQuery({
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        academicYearId: academicYearId || undefined,
    });
    const { data: studentDuesResponse, isFetching: isFetchingDues } = useGetFeeDuesQuery(
        {
            studentId: selectedStudentId || '',
            academicYearId: academicYearId || undefined,
        },
        {
            skip: !selectedStudentId,
        },
    );

    const [applyDiscount, { isLoading: isApplyingDiscount }] = useApplyDiscountMutation();

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<DiscountFormData>({
        resolver: zodResolver(discountSchema),
        defaultValues: {
            feeStructureId: '',
            discountMode: 'amount',
            discountValue: 0,
            reason: '',
        },
    });

    const classes = classesResponse?.data || [];
    const sections = sectionsResponse?.data || [];
    const students = studentsResponse?.data || [];
    const payments = paymentsResponse?.data || [];
    const duesDetails = studentDuesResponse?.data;

    const studentRows = useMemo(() => {
        const paidByStudent = new Map<string, number>();
        const pendingByStudent = new Map<string, number>();
        const overdueDaysByStudent = new Map<string, number>();

        for (const payment of payments) {
            const status = getStatusValue(payment.status);
            const amount = Number(payment.amount_paid || 0);
            const existingPaid = paidByStudent.get(payment.student_id) || 0;
            const existingPending = pendingByStudent.get(payment.student_id) || 0;
            const existingOverdue = overdueDaysByStudent.get(payment.student_id) || 0;

            if (status === 'pending') {
                pendingByStudent.set(payment.student_id, existingPending + amount);
                overdueDaysByStudent.set(
                    payment.student_id,
                    Math.max(existingOverdue, daysSince(payment.payment_date)),
                );
            } else if (status === 'paid' || status === 'success') {
                paidByStudent.set(payment.student_id, existingPaid + amount);
            }
        }

        const selectedSectionName = sections.find((item) => item.id === sectionId)?.name;

        const rows: StudentDueRow[] = students
            .map((student) => {
                const fullName = `${student.firstName} ${student.lastName}`.trim();
                const paid = paidByStudent.get(student.id) || 0;
                const outstanding = pendingByStudent.get(student.id) || 0;
                const total = paid + outstanding;

                return {
                    studentId: student.id,
                    studentName: fullName,
                    className: student.className || '-',
                    sectionName: student.sectionName || '-',
                    totalFee: total,
                    paid,
                    outstanding,
                    daysOverdue: overdueDaysByStudent.get(student.id) || 0,
                };
            })
            .filter((item) => item.outstanding > 0)
            .filter((item) => {
                if (!selectedSectionName) return true;
                return item.sectionName === selectedSectionName;
            })
            .sort((a, b) => b.outstanding - a.outstanding);

        return rows;
    }, [payments, sectionId, sections, students]);

    const summary = summaryResponse?.data;
    const totalAssigned = Number(summary?.totalAssigned || studentRows.reduce((sum, row) => sum + row.totalFee, 0));
    const totalCollected = Number(summary?.total_collected || studentRows.reduce((sum, row) => sum + row.paid, 0));
    const totalOutstanding = Number(summary?.totalOutstanding || studentRows.reduce((sum, row) => sum + row.outstanding, 0));
    const collectionPercent = totalAssigned > 0
        ? Math.round((totalCollected / totalAssigned) * 100)
        : Number(summary?.collectionPercentage || 0);

    const selectedStudentRow = studentRows.find((row) => row.studentId === selectedStudentId) || null;
    const discountMode = watch('discountMode');

    const openDiscountModal = () => {
        if (!selectedStudentId || !duesDetails || duesDetails.dues.length === 0) {
            setDiscountError('Select a student and load dues details first.');
            return;
        }

        setDiscountError('');
        setPageMessage('');
        reset({
            feeStructureId: duesDetails.dues[0]?.feeStructureId || '',
            discountMode: 'amount',
            discountValue: 0,
            reason: '',
        });
        setIsDiscountModalOpen(true);
    };

    const submitDiscount = async (values: DiscountFormData) => {
        if (!selectedStudentId) {
            setDiscountError('Student is required');
            return;
        }
        if (!academicYearId) {
            setDiscountError('Academic year is required');
            return;
        }

        const lineItem = duesDetails?.dues.find((item) => item.feeStructureId === values.feeStructureId);
        if (!lineItem) {
            setDiscountError('Selected fee item was not found');
            return;
        }

        const discountOverrideAmount = values.discountMode === 'percentage'
            ? Math.min(lineItem.outstandingAmount, (lineItem.outstandingAmount * values.discountValue) / 100)
            : Math.min(lineItem.outstandingAmount, values.discountValue);

        try {
            setDiscountError('');
            await applyDiscount({
                studentId: selectedStudentId,
                feeStructureId: values.feeStructureId,
                academicYearId,
                discountOverrideAmount: Number(discountOverrideAmount.toFixed(2)),
            }).unwrap();

            setIsDiscountModalOpen(false);
            setPageMessage('Discount applied successfully.');
        } catch (error) {
            setDiscountError(formatApiError(error));
        }
    };

    const isLoading = isLoadingStudents || isLoadingPayments;

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Fee Dues</h1>
                    <p className="text-sm text-muted-foreground">Track outstanding dues and apply discounts</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/admin/finance/fees/collect')}>
                    <CreditCard size={14} className="mr-2" />
                    Go To Collection
                </Button>
            </div>

            {pageMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {pageMessage}
                </div>
            )}

            {discountError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {discountError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5">
                    <p className="text-xs text-muted-foreground">Total Assigned</p>
                    <p className="text-2xl font-bold mt-1">₹ {totalAssigned.toLocaleString('en-IN')}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-xs text-muted-foreground">Total Collected</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-600">₹ {totalCollected.toLocaleString('en-IN')}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-xs text-muted-foreground">Total Outstanding</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">₹ {totalOutstanding.toLocaleString('en-IN')}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-xs text-muted-foreground">Collection %</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{collectionPercent}%</p>
                </Card>
            </div>

            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Class</label>
                        <select
                            value={classId}
                            onChange={(event) => {
                                setClassId(event.target.value);
                                setSectionId('');
                            }}
                            className="h-10 px-3 rounded-lg border border-input bg-background text-sm w-full"
                        >
                            <option value="">All Classes</option>
                            {classes.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Section</label>
                        <select
                            value={sectionId}
                            onChange={(event) => setSectionId(event.target.value)}
                            className="h-10 px-3 rounded-lg border border-input bg-background text-sm w-full"
                        >
                            <option value="">All Sections</option>
                            {sections.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Academic Year</label>
                        <Input
                            value={academicYearId}
                            onChange={(event) => setAcademicYearId(event.target.value)}
                            placeholder="Academic year ID"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Student Search</label>
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search student"
                                className="pl-9"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-10 flex justify-center">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : studentRows.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground">
                        No students with dues found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/40 border-b border-border">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Student</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Class</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Total Fee</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Paid</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Outstanding</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Days Overdue</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {studentRows.map((row) => (
                                    <motion.tr
                                        key={row.studentId}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={row.daysOverdue > 0 ? 'bg-red-50/40' : 'hover:bg-muted/20'}
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{row.studentName}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {row.className} {row.sectionName !== '-' ? `- ${row.sectionName}` : ''}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">₹ {row.totalFee.toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-3 text-right text-sm text-emerald-600">₹ {row.paid.toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">₹ {row.outstanding.toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            {row.daysOverdue > 0 ? (
                                                <span className="text-red-600">{row.daysOverdue}</span>
                                            ) : (
                                                <span className="text-muted-foreground">0</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedStudentId(row.studentId);
                                                        setPageMessage('');
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate(`/admin/finance/fees/collect?studentId=${row.studentId}`)}
                                                >
                                                    Collect
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedStudentId(row.studentId);
                                                        openDiscountModal();
                                                    }}
                                                >
                                                    Apply Discount
                                                </Button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {selectedStudentRow && (
                <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-semibold text-foreground">Due Breakdown</h3>
                            <p className="text-sm text-muted-foreground">{selectedStudentRow.studentName}</p>
                        </div>
                        {isFetchingDues && <LoadingSpinner size="sm" />}
                    </div>

                    {duesDetails?.dues && duesDetails.dues.length > 0 ? (
                        <div className="space-y-2">
                            {duesDetails.dues.map((item) => (
                                <div key={item.feeStructureId} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{item.feeName || 'Fee Item'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Outstanding</p>
                                            <p className="text-sm font-semibold text-red-600">
                                                ₹ {Number(item.outstandingAmount || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No due details available for this student.</p>
                    )}
                </Card>
            )}

            <Modal
                isOpen={isDiscountModalOpen}
                onClose={() => setIsDiscountModalOpen(false)}
                title="Apply Discount"
                size="md"
            >
                <form onSubmit={handleSubmit((values) => void submitDiscount(values))} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Fee Item</label>
                        <select
                            {...register('feeStructureId')}
                            className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.feeStructureId ? 'border-error' : 'border-input'}`}
                        >
                            <option value="">Select Fee Item</option>
                            {duesDetails?.dues.map((item) => (
                                <option key={item.feeStructureId} value={item.feeStructureId}>
                                    {item.feeName || item.feeStructureId}
                                </option>
                            ))}
                        </select>
                        {errors.feeStructureId && <p className="text-xs text-error">{errors.feeStructureId.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Discount Type</label>
                            <select
                                {...register('discountMode')}
                                className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.discountMode ? 'border-error' : 'border-input'}`}
                            >
                                <option value="amount">Amount</option>
                                <option value="percentage">Percentage</option>
                            </select>
                        </div>
                        <Input
                            label={discountMode === 'percentage' ? 'Percentage %' : 'Amount'}
                            type="number"
                            step="0.01"
                            {...register('discountValue')}
                            error={errors.discountValue?.message}
                        />
                    </div>

                    <Input
                        label="Reason"
                        placeholder="Enter reason for audit trail"
                        {...register('reason')}
                        error={errors.reason?.message}
                    />

                    {discountError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {discountError}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsDiscountModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isApplyingDiscount || isSubmitting}>
                            {(isApplyingDiscount || isSubmitting) ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-2" />
                                    Applying...
                                </>
                            ) : (
                                <>
                                    <Percent size={14} className="mr-2" />
                                    Apply Discount
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
