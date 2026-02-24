import { Request, Response } from 'express';

import { ApiError } from '../../../../core/http/ApiError';
import { HttpStatus } from '../../../../core/http/HttpStatus';
import { asyncHandler } from '../../../../core/utils/asyncHandler';
import { FeePaymentMode, FeePaymentStatus } from '../../../../database/models/school/fees/FeePayment.model';
import { FeeFrequency } from '../../../../database/models/school/fees/FeeStructure.model';
import { feeService } from '../services/fee.service';
import { toDecimal, toMoneyNumber } from '../utils/money';

type TenantRequest = Request & {
    tenant?: {
        db_schema?: string;
        id?: string;
    };
    user?: {
        userId?: string;
    };
    academicSessionId?: string;
};

type FeeStructureUpdatePayload = {
    feeCategoryId?: string;
    classId?: string;
    amount?: number;
    frequency?: FeeFrequency;
    dueDay?: number;
    lateFeePerDay?: number;
    isActive?: boolean;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pickString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized.length ? normalized : undefined;
};

const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_REGEX.test(value);

const getTenantContext = (req: Request): { schema: string; institutionId: string } => {
    const typedReq = req as TenantRequest;
    const schema = pickString(typedReq.tenant?.db_schema);
    const institutionId = pickString(typedReq.tenant?.id);

    if (!schema || !institutionId) {
        throw ApiError.badRequest('Tenant context missing');
    }

    return { schema, institutionId };
};

const resolveAcademicYearId = (
    req: Request,
    explicit?: unknown,
    required = true,
): string | undefined => {
    const headerSession = req.headers['x-academic-session-id'];
    const headerValue = Array.isArray(headerSession) ? headerSession[0] : headerSession;

    const candidates = [
        pickString(explicit),
        pickString(req.body?.academicYearId),
        pickString(req.body?.academicYear),
        pickString(req.query?.academicYearId),
        pickString(req.query?.academicYear),
        pickString((req as TenantRequest).academicSessionId),
        pickString(headerValue),
    ].filter(Boolean) as string[];

    const uuidCandidate = candidates.find((value) => isUuid(value));
    if (uuidCandidate) {
        return uuidCandidate;
    }

    if (candidates.length === 0) {
        if (required) {
            throw ApiError.badRequest('Academic year id is required');
        }
        return undefined;
    }

    if (required) {
        throw ApiError.badRequest('Academic year id must be a valid UUID');
    }

    return undefined;
};

const parseDueDay = (dueDate?: string): number | undefined => {
    if (!dueDate) return undefined;
    const parts = dueDate.split('-');
    const day = Number.parseInt(parts[2] || '', 10);
    if (!Number.isInteger(day) || day < 1 || day > 31) return undefined;
    return day;
};

const normalizePaymentMode = (value?: string): FeePaymentMode => {
    switch ((value || '').toLowerCase()) {
    case FeePaymentMode.CHEQUE:
        return FeePaymentMode.CHEQUE;
    case FeePaymentMode.ONLINE:
        return FeePaymentMode.ONLINE;
    case FeePaymentMode.UPI:
        return FeePaymentMode.UPI;
    case FeePaymentMode.DD:
        return FeePaymentMode.DD;
    case 'manual':
        return FeePaymentMode.CASH;
    case FeePaymentMode.CASH:
    default:
        return FeePaymentMode.CASH;
    }
};

const normalizePaymentStatus = (value?: string): FeePaymentStatus | undefined => {
    switch ((value || '').toLowerCase()) {
    case 'paid':
    case FeePaymentStatus.SUCCESS:
        return FeePaymentStatus.SUCCESS;
    case FeePaymentStatus.PENDING:
        return FeePaymentStatus.PENDING;
    case FeePaymentStatus.FAILED:
        return FeePaymentStatus.FAILED;
    case FeePaymentStatus.REFUNDED:
        return FeePaymentStatus.REFUNDED;
    default:
        return undefined;
    }
};

const toPlain = <T>(value: T): unknown => {
    if (value && typeof value === 'object') {
        const jsonSerializable = value as { toJSON?: () => unknown };
        if (typeof jsonSerializable.toJSON === 'function') {
            return jsonSerializable.toJSON();
        }
    }
    return value;
};

const toPlainArray = <T>(value: T[]): unknown[] => value.map((item) => toPlain(item));

const asRecord = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === 'object') {
        return value as Record<string, unknown>;
    }
    return {};
};

const withPaymentAliases = (input: unknown) => {
    const payment = asRecord(toPlain(input));
    const status = typeof payment.status === 'string' ? payment.status : undefined;
    const legacyStatus = status === FeePaymentStatus.SUCCESS ? 'paid' : status;

    return {
        ...payment,
        payment_method: payment.payment_mode,
        transaction_ref: payment.payment_reference,
        legacy_status: legacyStatus,
    };
};

const sendSuccess = (
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, unknown>,
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
        ...(meta ? { meta } : {}),
    });
};

const getCategories = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.query.academicYearId, true) as string;

    const categories = await feeService.getCategories(academicYearId, schema);
    return sendSuccess(res, toPlainArray(categories));
});

const createCategory = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.body.academicYearId, true) as string;

    const category = await feeService.createCategory(
        {
            institutionId,
            academicYearId,
            name: req.body.name,
            description: req.body.description,
            isActive: req.body.isActive,
        },
        schema,
    );

    return sendSuccess(res, toPlain(category), 'Category created successfully', 201);
});

const updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const id = req.params.id;
    if (!id) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Category ID is required');
    }
    const category = await feeService.updateCategory(id, req.body, schema);
    return sendSuccess(res, toPlain(category), 'Category updated successfully');
});

const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const id = req.params.id;
    if (!id) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Category ID is required');
    }
    await feeService.deleteCategory(id, schema);
    return sendSuccess(res, null, 'Category deleted');
});

const getStructures = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.query.academicYearId, true) as string;

    const structures = await feeService.getStructures(
        {
            academicYearId,
            classId: pickString(req.query.classId),
        },
        schema,
    );

    return sendSuccess(res, toPlainArray(structures));
});

const getStructureById = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const id = req.params.id;
    if (!id) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Structure ID is required');
    }
    const structure = await feeService.getStructureById(id, schema);
    return sendSuccess(res, toPlain(structure));
});

const createStructure = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.body.academicYearId, true) as string;
    const feeCategoryId = pickString(req.body.feeCategoryId) || pickString(req.body.categoryId);

    if (!feeCategoryId) {
        throw ApiError.badRequest('Fee category id is required');
    }

    const structure = await feeService.createStructure(
        {
            institutionId,
            academicYearId,
            feeCategoryId,
            classId: req.body.classId,
            amount: req.body.amount,
            frequency: (req.body.frequency || FeeFrequency.ONE_TIME) as FeeFrequency,
            dueDay: req.body.dueDay ?? parseDueDay(req.body.dueDate),
            lateFeePerDay: req.body.lateFeePerDay,
            isActive: req.body.isActive,
        },
        schema,
    );

    return sendSuccess(res, toPlain(structure), 'Structure created successfully', 201);
});

const updateStructure = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);

    const payload: FeeStructureUpdatePayload = {};

    const feeCategoryId = pickString(req.body.feeCategoryId) || pickString(req.body.categoryId);
    if (feeCategoryId) payload.feeCategoryId = feeCategoryId;
    if (req.body.classId !== undefined) payload.classId = req.body.classId;
    if (req.body.amount !== undefined) payload.amount = req.body.amount;
    if (req.body.frequency !== undefined) payload.frequency = req.body.frequency;
    if (req.body.lateFeePerDay !== undefined) payload.lateFeePerDay = req.body.lateFeePerDay;
    if (req.body.isActive !== undefined) payload.isActive = req.body.isActive;

    if (req.body.dueDay !== undefined || req.body.dueDate !== undefined) {
        payload.dueDay = req.body.dueDay ?? parseDueDay(req.body.dueDate);
    }

    const id = req.params.id;
    if (!id) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Structure ID is required');
    }
    const structure = await feeService.updateStructure(id, payload, schema);
    return sendSuccess(res, toPlain(structure), 'Structure updated successfully');
});

const deleteStructure = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const id = req.params.id;
    if (!id) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Structure ID is required');
    }
    await feeService.deleteStructure(id, schema);
    return sendSuccess(res, null, 'Structure deleted');
});

const assignToStudent = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.body.academicYearId, true) as string;

    const result = await feeService.assignFeesToStudent(
        {
            institutionId,
            studentId: req.body.studentId,
            academicYearId,
            feeStructureIds: req.body.feeStructureIds,
            discountId: req.body.discountId,
            discountOverrideAmount: req.body.discountOverrideAmount,
        },
        schema,
    );

    return sendSuccess(res, toPlain(result), 'Fees assigned to student', 201);
});

const assignToClass = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.body.academicYearId, true) as string;

    const result = await feeService.assignFeesToClass(
        {
            institutionId,
            classId: req.body.classId,
            academicYearId,
            discountId: req.body.discountId,
            discountOverrideAmount: req.body.discountOverrideAmount,
        },
        schema,
    );

    return sendSuccess(res, toPlain(result), 'Fees assigned to class', 201);
});

const getStudentAssignments = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.query.academicYearId, true) as string;

    const studentId = req.params.studentId;
    if (!studentId) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Student ID is required');
    }
    const assignments = await feeService.getStudentAssignments(studentId, academicYearId, schema);
    return sendSuccess(res, toPlainArray(assignments));
});

const getPayments = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.query.academicYearId, false);

    const payments = await feeService.getPayments(
        {
            academicYearId,
            studentId: pickString(req.query.studentId),
            status: normalizePaymentStatus(pickString(req.query.status)),
            from: pickString(req.query.from),
            to: pickString(req.query.to),
        },
        schema,
    );

    return sendSuccess(res, toPlainArray(payments).map(withPaymentAliases));
});

const collectPayment = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.body.academicYearId, true) as string;

    const paymentMode = normalizePaymentMode(
        pickString(req.body.paymentMode) || pickString(req.body.paymentMethod),
    );

    const payment = await feeService.collectFee(
        {
            institutionId,
            studentId: req.body.studentId,
            academicYearId,
            feeStructureId: req.body.feeStructureId,
            amountPaid: req.body.amountPaid,
            paymentDate: req.body.paymentDate,
            paymentMode,
            paymentReference: pickString(req.body.paymentReference) || pickString(req.body.transactionRef),
            remarks: req.body.remarks,
            collectedBy: pickString((req as TenantRequest).user?.userId),
            status: normalizePaymentStatus(pickString(req.body.status)),
        },
        schema,
    );

    return sendSuccess(res, withPaymentAliases(payment), 'Payment collected successfully', 201);
});

const getStudentPayments = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.query.academicYearId, true) as string;

    const studentId = req.params.studentId;
    if (!studentId) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Student ID is required');
    }
    const payments = await feeService.getStudentPayments(studentId, academicYearId, schema);
    return sendSuccess(res, toPlainArray(payments).map(withPaymentAliases));
});

const getPaymentReceipt = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const receiptNumber = req.params.receiptNumber;
    if (!receiptNumber) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Receipt number is required');
    }
    const receipt = await feeService.getPaymentReceipt(receiptNumber, institutionId, schema);
    return sendSuccess(res, withPaymentAliases(receipt));
});

const getStudentDues = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.query.academicYearId, true) as string;

    const studentId = req.params.studentId;
    if (!studentId) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Student ID is required');
    }
    const dues = await feeService.getStudentDues(studentId, academicYearId, schema);
    return sendSuccess(res, dues);
});

const getSummary = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.query.academicYearId, true) as string;
    const classId = pickString(req.query.classId);

    if (classId && !isUuid(classId)) {
        throw ApiError.badRequest('Class id must be a valid UUID');
    }

    const summary = await feeService.getFeeSummary(academicYearId, classId, schema);

    const payments = await feeService.getPayments({ academicYearId }, schema);
    const plainPayments = toPlainArray(payments).map(asRecord);
    const today = new Date().toISOString().slice(0, 10);

    const paidCount = plainPayments.filter((p) => p.status === FeePaymentStatus.SUCCESS).length;
    const pendingCount = plainPayments.filter((p) => p.status === FeePaymentStatus.PENDING).length;
    const todayCollection = plainPayments
        .filter((p) => p.payment_date === today && p.status === FeePaymentStatus.SUCCESS)
        .reduce(
            (sum, p) => sum.plus(toDecimal(p.amount_paid as string | number | null | undefined)),
            toDecimal(0),
        );

    return sendSuccess(res, {
        ...summary,
        total_payments: plainPayments.length,
        total_collected: summary.totalCollected,
        paid_count: paidCount,
        pending_count: pendingCount,
        today_collection: toMoneyNumber(todayCollection),
    });
});

const getDiscounts = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const discounts = await feeService.getDiscounts(schema);
    return sendSuccess(res, toPlainArray(discounts));
});

const createDiscount = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const discount = await feeService.createDiscount(
        {
            institutionId,
            name: req.body.name,
            discountType: req.body.discountType,
            discountValue: req.body.discountValue,
            isActive: req.body.isActive,
        },
        schema,
    );

    return sendSuccess(res, toPlain(discount), 'Discount created successfully', 201);
});

const updateDiscount = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const id = req.params.id;
    if (!id) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Discount ID is required');
    }
    const discount = await feeService.updateDiscount(id, req.body, schema);
    return sendSuccess(res, toPlain(discount), 'Discount updated successfully');
});

const deleteDiscount = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const id = req.params.id;
    if (!id) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Discount ID is required');
    }
    await feeService.deleteDiscount(id, schema);
    return sendSuccess(res, null, 'Discount deleted');
});

const applyDiscount = asyncHandler(async (req: Request, res: Response) => {
    const { schema } = getTenantContext(req);
    const academicYearId = resolveAcademicYearId(req, req.body.academicYearId, true) as string;

    const result = await feeService.applyDiscount(
        req.body.studentId,
        req.body.feeStructureId,
        academicYearId,
        req.body.discountId,
        req.body.discountOverrideAmount,
        schema,
    );

    return sendSuccess(res, toPlain(result), 'Discount applied successfully');
});

export const feeController = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getStructures,
    getStructureById,
    createStructure,
    updateStructure,
    deleteStructure,
    assignToStudent,
    assignToClass,
    getStudentAssignments,
    getPayments,
    collectPayment,
    getStudentPayments,
    getPaymentReceipt,
    getStudentDues,
    getSummary,
    getDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    applyDiscount,
};

