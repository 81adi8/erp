import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID');

const amountSchema = z.coerce
    .number()
    .positive('Amount must be greater than 0')
    .max(1_000_000_000, 'Amount is too large');

const nonNegativeAmountSchema = z.coerce
    .number()
    .min(0, 'Value cannot be negative')
    .max(1_000_000_000, 'Value is too large');

const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const optionalTrimmed = (max: number) => z.string().trim().max(max).optional();
const looseAcademicYearSchema = z.string().trim().min(1).max(50).optional();

export const FeeIdParamSchema = z.object({
    id: uuidSchema,
}).strict();

export const FeeStudentParamSchema = z.object({
    studentId: uuidSchema,
}).strict();

export const FeeReceiptParamSchema = z.object({
    receiptNumber: z.string().trim().min(1, 'Receipt number is required').max(100),
}).strict();

export const FeeCategoryCreateSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(150),
    description: optionalTrimmed(500),
    isActive: z.coerce.boolean().optional(),
}).strict();

export const FeeCategoryUpdateSchema = z.object({
    name: z.string().trim().min(1).max(150).optional(),
    description: optionalTrimmed(500),
    isActive: z.coerce.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
});

export const FeeCategoryListQuerySchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
}).strict();

export const FeeStructureCreateSchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
    feeCategoryId: uuidSchema.optional(),
    categoryId: uuidSchema.optional(),
    classId: uuidSchema,
    amount: amountSchema,
    frequency: z.enum(['monthly', 'quarterly', 'annually', 'one_time']).default('one_time'),
    dueDay: z.coerce.number().int().min(1).max(31).optional(),
    dueDate: dateSchema.optional(),
    lateFeePerDay: nonNegativeAmountSchema.optional(),
    isActive: z.coerce.boolean().optional(),
}).strict().refine((data) => data.feeCategoryId || data.categoryId, {
    message: 'Either feeCategoryId or categoryId is required',
    path: ['feeCategoryId'],
});

export const FeeStructureUpdateSchema = z.object({
    feeCategoryId: uuidSchema.optional(),
    categoryId: uuidSchema.optional(),
    classId: uuidSchema.optional(),
    amount: amountSchema.optional(),
    frequency: z.enum(['monthly', 'quarterly', 'annually', 'one_time']).optional(),
    dueDay: z.coerce.number().int().min(1).max(31).optional(),
    dueDate: dateSchema.optional(),
    lateFeePerDay: nonNegativeAmountSchema.optional(),
    isActive: z.coerce.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
});

export const FeeStructureListQuerySchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
    classId: uuidSchema.optional(),
}).strict();

export const FeeAssignToStudentSchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
    studentId: uuidSchema,
    feeStructureIds: z.array(uuidSchema).min(1, 'At least one fee structure id is required').optional(),
    discountId: uuidSchema.optional(),
    discountOverrideAmount: nonNegativeAmountSchema.optional(),
}).strict();

export const FeeAssignToClassSchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
    classId: uuidSchema,
    discountId: uuidSchema.optional(),
    discountOverrideAmount: nonNegativeAmountSchema.optional(),
}).strict();

export const FeeCollectSchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
    studentId: uuidSchema,
    feeStructureId: uuidSchema,
    amountPaid: amountSchema,
    paymentDate: dateSchema.optional(),
    paymentMode: z.enum(['cash', 'cheque', 'online', 'upi', 'dd']).optional(),
    paymentMethod: z.enum(['cash', 'cheque', 'online', 'upi', 'dd', 'manual']).optional(),
    paymentReference: optionalTrimmed(255),
    transactionRef: optionalTrimmed(255),
    remarks: optionalTrimmed(500),
    status: z.enum(['success', 'pending', 'failed', 'refunded', 'paid']).optional(),
}).strict();

export const FeeDiscountCreateSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(150),
    discountType: z.enum(['percentage', 'flat']),
    discountValue: amountSchema,
    isActive: z.coerce.boolean().optional(),
}).strict().superRefine((data, ctx) => {
    if (data.discountType === 'percentage' && data.discountValue > 100) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['discountValue'],
            message: 'Percentage discount cannot exceed 100',
        });
    }
});

export const FeeDiscountUpdateSchema = z.object({
    name: z.string().trim().min(1).max(150).optional(),
    discountType: z.enum(['percentage', 'flat']).optional(),
    discountValue: amountSchema.optional(),
    isActive: z.coerce.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
});

export const FeeDiscountApplySchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
    studentId: uuidSchema,
    feeStructureId: uuidSchema,
    discountId: uuidSchema.optional(),
    discountOverrideAmount: nonNegativeAmountSchema.optional(),
}).strict().refine((data) => data.discountId || data.discountOverrideAmount !== undefined, {
    message: 'Either discountId or discountOverrideAmount is required',
    path: ['discountId'],
});

export const FeePaymentsQuerySchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
    studentId: uuidSchema.optional(),
    status: z.enum(['success', 'pending', 'failed', 'refunded', 'paid']).optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
}).strict();

export const FeeSummaryQuerySchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
    classId: uuidSchema.optional(),
}).strict();

export const FeeDuesQuerySchema = z.object({
    academicYearId: uuidSchema.optional(),
    academicYear: looseAcademicYearSchema,
}).strict();
