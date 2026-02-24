import { sequelize } from '../../../../database/sequelize';
import { ApiError } from '../../../../core/http/ApiError';
import {
    feeRepository,
    CreateCategoryData,
    UpdateCategoryData,
    CreateStructureData,
    UpdateStructureData,
    CreateDiscountData,
    UpdateDiscountData,
    PaymentListFilters,
    FindStructuresFilters,
} from '../repositories/fee.repository';
import { FeeDiscountType } from '../../../../database/models/school/fees/FeeDiscount.model';
import { FeePaymentMode, FeePaymentStatus } from '../../../../database/models/school/fees/FeePayment.model';
import { FeeStructure, FeeFrequency } from '../../../../database/models/school/fees/FeeStructure.model';
import {
    maxDecimal,
    minDecimal,
    toDecimal,
    toMoneyDecimal,
    toMoneyString,
} from '../utils/money';

export interface CreateCategoryInput {
    institutionId: string;
    academicYearId: string;
    name: string;
    description?: string;
    isActive?: boolean;
}

export interface UpdateCategoryInput {
    name?: string;
    description?: string;
    isActive?: boolean;
}

export interface CreateStructureInput {
    institutionId: string;
    academicYearId: string;
    feeCategoryId: string;
    classId: string;
    amount: number;
    frequency: FeeFrequency;
    dueDay?: number;
    lateFeePerDay?: number;
    isActive?: boolean;
}

export interface UpdateStructureInput {
    feeCategoryId?: string;
    classId?: string;
    amount?: number;
    frequency?: FeeFrequency;
    dueDay?: number;
    lateFeePerDay?: number;
    isActive?: boolean;
}

export interface AssignFeesToStudentInput {
    institutionId: string;
    studentId: string;
    academicYearId: string;
    feeStructureIds?: string[];
    discountId?: string;
    discountOverrideAmount?: number;
}

export interface AssignFeesToClassInput {
    institutionId: string;
    classId: string;
    academicYearId: string;
    discountId?: string;
    discountOverrideAmount?: number;
}

export interface CollectFeeInput {
    institutionId: string;
    studentId: string;
    academicYearId: string;
    feeStructureId: string;
    amountPaid: number;
    paymentDate?: string;
    paymentMode: FeePaymentMode;
    paymentReference?: string;
    remarks?: string;
    collectedBy?: string;
    status?: FeePaymentStatus;
    // FEE-01 FIX: Added idempotency_key for duplicate payment prevention
    idempotencyKey?: string;
}

export interface CreateDiscountInput {
    institutionId: string;
    name: string;
    discountType: FeeDiscountType;
    discountValue: number;
    isActive?: boolean;
}

export interface UpdateDiscountInput {
    name?: string;
    discountType?: FeeDiscountType;
    discountValue?: number;
    isActive?: boolean;
}

interface DiscountApplicationResult {
    discountId?: string;
    discountOverrideAmount?: string;
    finalAmount: string;
}

export class FeeService {
    // Categories
    async getCategories(academicYearId: string, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(academicYearId, 'Academic year id is required');
        return feeRepository.findAllCategories(academicYearId, schema);
    }

    async createCategory(input: CreateCategoryInput, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(input.institutionId, 'Institution id is required');
        this.ensureUuid(input.academicYearId, 'Academic year id is required');

        const name = input.name?.trim();
        if (!name) {
            throw ApiError.badRequest('Category name is required');
        }

        return sequelize.transaction(async (tx) => {
            const existing = await feeRepository.findCategoryByName(
                input.institutionId,
                input.academicYearId,
                name,
                schema,
            );

            if (existing) {
                throw ApiError.conflict('Fee category with same name already exists for this academic year');
            }

            const payload: CreateCategoryData = {
                institution_id: input.institutionId,
                academic_year_id: input.academicYearId,
                name,
                description: input.description?.trim() || undefined,
                is_active: input.isActive,
            };

            return feeRepository.createCategory(payload, schema, tx);
        });
    }

    async updateCategory(id: string, input: UpdateCategoryInput, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Category id is required');

        if (!Object.keys(input).length) {
            throw ApiError.badRequest('At least one field is required for update');
        }

        return sequelize.transaction(async (tx) => {
            const existing = await feeRepository.findCategoryById(id, schema);
            if (!existing) {
                throw ApiError.notFound('Fee category not found');
            }

            const nextName = input.name?.trim();
            if (nextName && nextName !== existing.name) {
                const duplicate = await feeRepository.findCategoryByName(
                    existing.institution_id,
                    existing.academic_year_id,
                    nextName,
                    schema,
                );

                if (duplicate && duplicate.id !== id) {
                    throw ApiError.conflict('Fee category with same name already exists for this academic year');
                }
            }

            const payload: UpdateCategoryData = {
                ...(input.name !== undefined ? { name: nextName } : {}),
                ...(input.description !== undefined ? { description: input.description?.trim() || '' } : {}),
                ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
            };

            return feeRepository.updateCategory(id, payload, schema, tx);
        });
    }

    async deleteCategory(id: string, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Category id is required');

        return sequelize.transaction(async (tx) => {
            await feeRepository.deleteCategory(id, schema, tx);
            return { deleted: true };
        });
    }

    // Structures
    async getStructures(filters: FindStructuresFilters, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(filters.academicYearId, 'Academic year id is required');
        if (filters.classId) {
            this.ensureUuid(filters.classId, 'Class id must be a valid UUID');
        }
        return feeRepository.findAllStructures(filters, schema);
    }

    async getStructureById(id: string, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Structure id is required');

        const structure = await feeRepository.findStructureById(id, schema);
        if (!structure) {
            throw ApiError.notFound('Fee structure not found');
        }
        return structure;
    }

    async createStructure(input: CreateStructureInput, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(input.institutionId, 'Institution id is required');
        this.ensureUuid(input.academicYearId, 'Academic year id is required');
        this.ensureUuid(input.feeCategoryId, 'Fee category id is required');
        this.ensureUuid(input.classId, 'Class id is required');

        const amount = this.ensurePositiveNumber(input.amount, 'Amount must be greater than 0');
        this.validateFrequency(input.frequency);
        this.validateDueDay(input.dueDay);
        this.validateNonNegative(input.lateFeePerDay, 'Late fee per day cannot be negative');

        return sequelize.transaction(async (tx) => {
            const category = await feeRepository.findCategoryById(input.feeCategoryId, schema);
            if (!category) {
                throw ApiError.badRequest('Fee category does not exist');
            }

            if (category.academic_year_id !== input.academicYearId) {
                throw ApiError.badRequest('Fee category academic year mismatch');
            }

            if (category.institution_id !== input.institutionId) {
                throw ApiError.badRequest('Fee category institution mismatch');
            }

            const klass = await feeRepository.findClassById(input.classId, schema);
            if (!klass) {
                throw ApiError.badRequest('Class does not exist');
            }

            if (klass.institution_id !== input.institutionId) {
                throw ApiError.badRequest('Class institution mismatch');
            }

            const duplicate = await feeRepository.findStructureByComposite(
                input.institutionId,
                input.academicYearId,
                input.feeCategoryId,
                input.classId,
                schema,
            );

            if (duplicate) {
                throw ApiError.conflict('Fee structure already exists for this category and class');
            }

            const payload: CreateStructureData = {
                institution_id: input.institutionId,
                academic_year_id: input.academicYearId,
                fee_category_id: input.feeCategoryId,
                class_id: input.classId,
                amount: toMoneyString(amount),
                frequency: input.frequency,
                due_day: input.dueDay,
                late_fee_per_day: input.lateFeePerDay !== undefined
                    ? toMoneyString(this.ensureNonNegativeMoney(input.lateFeePerDay, 'Late fee per day cannot be negative'))
                    : undefined,
                is_active: input.isActive,
            };

            return feeRepository.createStructure(payload, schema, tx);
        });
    }

    async updateStructure(id: string, input: UpdateStructureInput, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Structure id is required');

        if (!Object.keys(input).length) {
            throw ApiError.badRequest('At least one field is required for update');
        }

        if (input.feeCategoryId) {
            this.ensureUuid(input.feeCategoryId, 'Fee category id must be a valid UUID');
        }
        if (input.classId) {
            this.ensureUuid(input.classId, 'Class id must be a valid UUID');
        }
        if (input.amount !== undefined) {
            this.ensurePositiveNumber(input.amount, 'Amount must be greater than 0');
        }
        if (input.frequency) {
            this.validateFrequency(input.frequency);
        }

        this.validateDueDay(input.dueDay);
        this.validateNonNegative(input.lateFeePerDay, 'Late fee per day cannot be negative');

        return sequelize.transaction(async (tx) => {
            const existing = await feeRepository.findStructureById(id, schema);
            if (!existing) {
                throw ApiError.notFound('Fee structure not found');
            }

            const nextCategoryId = input.feeCategoryId || existing.fee_category_id;
            const nextClassId = input.classId || existing.class_id;

            if (nextCategoryId !== existing.fee_category_id || nextClassId !== existing.class_id) {
                const duplicate = await feeRepository.findStructureByComposite(
                    existing.institution_id,
                    existing.academic_year_id,
                    nextCategoryId,
                    nextClassId,
                    schema,
                );

                if (duplicate && duplicate.id !== id) {
                    throw ApiError.conflict('Fee structure already exists for this category and class');
                }
            }

            const payload: UpdateStructureData = {
                ...(input.feeCategoryId !== undefined ? { fee_category_id: input.feeCategoryId } : {}),
                ...(input.classId !== undefined ? { class_id: input.classId } : {}),
                ...(input.amount !== undefined
                    ? { amount: toMoneyString(this.ensurePositiveNumber(input.amount, 'Amount must be greater than 0')) }
                    : {}),
                ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
                ...(input.dueDay !== undefined ? { due_day: input.dueDay } : {}),
                ...(input.lateFeePerDay !== undefined
                    ? { late_fee_per_day: toMoneyString(this.ensureNonNegativeMoney(input.lateFeePerDay, 'Late fee per day cannot be negative')) }
                    : {}),
                ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
            };

            return feeRepository.updateStructure(id, payload, schema, tx);
        });
    }

    async deleteStructure(id: string, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Structure id is required');

        return sequelize.transaction(async (tx) => {
            await feeRepository.deleteStructure(id, schema, tx);
            return { deleted: true };
        });
    }

    // Assignments
    async assignFeesToStudent(input: AssignFeesToStudentInput, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(input.institutionId, 'Institution id is required');
        this.ensureUuid(input.studentId, 'Student id is required');
        this.ensureUuid(input.academicYearId, 'Academic year id is required');

        const requestedStructureIds = this.ensureUniqueStructureIds(input.feeStructureIds);

        return sequelize.transaction(async (tx) => {
            const student = await feeRepository.findStudentById(input.studentId, schema);
            if (!student) {
                throw ApiError.notFound('Student not found');
            }

            if (student.institution_id !== input.institutionId) {
                throw ApiError.badRequest('Student institution mismatch');
            }

            const enrollment = await feeRepository.findActiveEnrollment(
                input.studentId,
                input.academicYearId,
                schema,
            );

            if (!enrollment) {
                throw ApiError.badRequest('Student does not have active enrollment in this academic year');
            }

            const structureIds = requestedStructureIds ?? (
                await feeRepository.findStructuresByClass(
                    enrollment.class_id,
                    input.academicYearId,
                    schema,
                )
            ).map((structure) => structure.id);

            if (structureIds.length === 0) {
                throw ApiError.badRequest('No active fee structures found for student class and academic year');
            }

            const discount = await this.resolveDiscount(input.discountId, schema);
            const assignments: Array<{ structureId: string; assignment: unknown; skipped?: boolean }> = [];

            for (const structureId of structureIds) {
                const structure = await this.getStructureForAssignment(
                    structureId,
                    input.institutionId,
                    input.academicYearId,
                    enrollment.class_id,
                    schema,
                );

                const computed = this.computeDiscountApplication(
                    structure.amount,
                    discount,
                    input.discountOverrideAmount,
                );

                const existing = await feeRepository.findAssignment(
                    input.studentId,
                    structureId,
                    input.academicYearId,
                    schema,
                );

                if (existing) {
                    assignments.push({ structureId, assignment: existing, skipped: true });
                    continue;
                }

                const created = await feeRepository.assignFeeToStudent(
                    {
                        institution_id: input.institutionId,
                        student_id: input.studentId,
                        fee_structure_id: structureId,
                        academic_year_id: input.academicYearId,
                        discount_id: computed.discountId,
                        discount_override_amount: computed.discountOverrideAmount,
                        final_amount: computed.finalAmount,
                    },
                    schema,
                    tx,
                );

                assignments.push({ structureId, assignment: created });
            }

            return {
                studentId: input.studentId,
                academicYearId: input.academicYearId,
                assignedCount: assignments.filter((entry) => !entry.skipped).length,
                skippedCount: assignments.filter((entry) => entry.skipped).length,
                assignments,
            };
        });
    }

    async assignFeesToClass(input: AssignFeesToClassInput, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(input.institutionId, 'Institution id is required');
        this.ensureUuid(input.classId, 'Class id is required');
        this.ensureUuid(input.academicYearId, 'Academic year id is required');

        return sequelize.transaction(async (tx) => {
            const klass = await feeRepository.findClassById(input.classId, schema);
            if (!klass) {
                throw ApiError.notFound('Class not found');
            }

            if (klass.institution_id !== input.institutionId) {
                throw ApiError.badRequest('Class institution mismatch');
            }

            const enrollments = await feeRepository.findStudentsByClass(
                input.classId,
                input.academicYearId,
                schema,
            );

            if (enrollments.length === 0) {
                return {
                    classId: input.classId,
                    academicYearId: input.academicYearId,
                    assignedCount: 0,
                    message: 'No active students found in class',
                };
            }

            const structures = await feeRepository.findStructuresByClass(
                input.classId,
                input.academicYearId,
                schema,
            );

            if (structures.length === 0) {
                throw ApiError.badRequest('No active fee structures found for class and academic year');
            }

            const discount = await this.resolveDiscount(input.discountId, schema);
            const structureIds = structures.map((s) => s.id);
            let assignedCount = 0;
            let skippedCount = 0;

            for (const enrollment of enrollments) {
                const existingAssignments = await feeRepository.findStudentAssignmentsByStructures(
                    enrollment.student_id,
                    input.academicYearId,
                    structureIds,
                    schema,
                );

                const existingByStructure = new Map<string, string>(
                    existingAssignments.map((a) => [a.fee_structure_id, a.id]),
                );

                for (const structure of structures) {
                    const computed = this.computeDiscountApplication(
                        structure.amount,
                        discount,
                        input.discountOverrideAmount,
                    );

                    const existingId = existingByStructure.get(structure.id);
                    if (existingId) {
                        skippedCount += 1;
                    } else {
                        await feeRepository.assignFeeToStudent(
                            {
                                institution_id: input.institutionId,
                                student_id: enrollment.student_id,
                                fee_structure_id: structure.id,
                                academic_year_id: input.academicYearId,
                                discount_id: computed.discountId,
                                discount_override_amount: computed.discountOverrideAmount,
                                final_amount: computed.finalAmount,
                            },
                            schema,
                            tx,
                        );

                        assignedCount += 1;
                    }
                }
            }

            return {
                classId: input.classId,
                academicYearId: input.academicYearId,
                studentCount: enrollments.length,
                structureCount: structures.length,
                assignedCount,
                skippedCount,
            };
        });
    }

    async getStudentAssignments(studentId: string, academicYearId: string, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(studentId, 'Student id is required');
        this.ensureUuid(academicYearId, 'Academic year id is required');

        return feeRepository.getStudentAssignments(studentId, academicYearId, schema);
    }

    // Payments
    async collectFee(input: CollectFeeInput, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(input.institutionId, 'Institution id is required');
        this.ensureUuid(input.studentId, 'Student id is required');
        this.ensureUuid(input.academicYearId, 'Academic year id is required');
        this.ensureUuid(input.feeStructureId, 'Fee structure id is required');

        // FEE-01 FIX: Check for idempotency key to prevent duplicate payments
        if (input.idempotencyKey) {
            const existingPayment = await feeRepository.findPaymentByIdempotencyKey(input.idempotencyKey, schema);
            if (existingPayment) {
                return existingPayment;
            }
        }

        const amountPaid = this.ensurePositiveNumber(input.amountPaid, 'Amount paid must be greater than 0');
        this.validatePaymentMode(input.paymentMode);

        return sequelize.transaction(async (tx) => {
            const student = await feeRepository.findStudentById(input.studentId, schema);
            if (!student) {
                throw ApiError.notFound('Student not found');
            }

            if (student.institution_id !== input.institutionId) {
                throw ApiError.badRequest('Student institution mismatch');
            }

            const structure = await feeRepository.findStructureById(input.feeStructureId, schema);
            if (!structure) {
                throw ApiError.notFound('Fee structure not found');
            }

            if (structure.institution_id !== input.institutionId) {
                throw ApiError.badRequest('Fee structure institution mismatch');
            }

            if (structure.academic_year_id !== input.academicYearId) {
                throw ApiError.badRequest('Fee structure academic year mismatch');
            }

            // FEE-02 FIX: Use row-level lock to prevent concurrent payment race conditions
            const assignment = await feeRepository.findAssignmentWithLock(
                input.studentId,
                input.feeStructureId,
                input.academicYearId,
                schema,
                tx,
            );

            if (!assignment) {
                throw ApiError.badRequest('Fee structure is not assigned to student for this academic year');
            }

            const paymentDate = input.paymentDate || new Date().toISOString().slice(0, 10);
            const lateFee = this.calculateLateFee(
                structure.late_fee_per_day,
                structure.due_day,
                paymentDate,
            );

            const dues = await feeRepository.getStudentDues(input.studentId, input.academicYearId, schema);
            if (toDecimal(dues.outstanding).lte(0)) {
                throw ApiError.badRequest('No outstanding dues found for student');
            }

            const maxCollectable = toMoneyDecimal(toDecimal(dues.outstanding).plus(lateFee.amount));
            if (amountPaid.gt(maxCollectable)) {
                throw ApiError.badRequest('Amount paid cannot exceed total outstanding dues including applicable late fee');
            }

            const receiptNumber = await feeRepository.generateReceiptNumber(
                input.institutionId,
                schema,
                tx,
            );

            return feeRepository.createPayment(
                {
                    institution_id: input.institutionId,
                    student_id: input.studentId,
                    academic_year_id: input.academicYearId,
                    receipt_number: receiptNumber,
                    payment_date: paymentDate,
                    amount_paid: toMoneyString(amountPaid),
                    payment_mode: input.paymentMode,
                    payment_reference: input.paymentReference?.trim() || undefined,
                    fee_structure_id: input.feeStructureId,
                    collected_by: input.collectedBy,
                    remarks: this.mergeRemarks(input.remarks, lateFee),
                    status: input.status || FeePaymentStatus.SUCCESS,
                    // FEE-01 FIX: Store idempotency key
                    idempotency_key: input.idempotencyKey,
                },
                schema,
                tx,
            );
        });
    }

    // FEE-04 FIX: Refund payment flow with audit trail
    async refundPayment(paymentId: string, schema: string, refundedBy: string, reason?: string) {
        this.ensureSchema(schema);
        this.ensureUuid(paymentId, 'Payment id is required');
        this.ensureUuid(refundedBy, 'Refunded by user id is required');

        return sequelize.transaction(async (tx) => {
            const payment = await feeRepository.findPaymentById(paymentId, schema, tx);
            if (!payment) {
                throw ApiError.notFound('Payment not found');
            }

            if (payment.status === FeePaymentStatus.REFUNDED) {
                throw ApiError.badRequest('Payment has already been refunded');
            }

            if (payment.status !== FeePaymentStatus.SUCCESS) {
                throw ApiError.badRequest('Only successful payments can be refunded');
            }

            const updatedRemarks = [
                payment.remarks,
                reason ? `Refund reason: ${reason}` : 'Refunded',
                `Refunded by: ${refundedBy}`,
                `Refund date: ${new Date().toISOString()}`,
            ].filter(Boolean).join('; ');

            await feeRepository.updatePaymentStatus(
                paymentId,
                {
                    status: FeePaymentStatus.REFUNDED,
                    voided_by: refundedBy,
                    remarks: updatedRemarks,
                },
                schema,
                tx,
            );

            return feeRepository.findPaymentById(paymentId, schema, tx);
        });
    }

    async getPayments(filters: PaymentListFilters, schema: string) {
        this.ensureSchema(schema);
        if (filters.academicYearId) {
            this.ensureUuid(filters.academicYearId, 'Academic year id must be a valid UUID');
        }
        if (filters.studentId) {
            this.ensureUuid(filters.studentId, 'Student id must be a valid UUID');
        }
        return feeRepository.findPayments(filters, schema);
    }

    async getStudentPayments(studentId: string, academicYearId: string, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(studentId, 'Student id is required');
        this.ensureUuid(academicYearId, 'Academic year id is required');
        return feeRepository.findPaymentsByStudent(studentId, academicYearId, schema);
    }

    async getPaymentReceipt(receiptNumber: string, institutionId: string, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(institutionId, 'Institution id is required');

        const normalizedReceipt = receiptNumber?.trim();
        if (!normalizedReceipt) {
            throw ApiError.badRequest('Receipt number is required');
        }

        const payment = await feeRepository.findPaymentByReceiptNumber(normalizedReceipt, institutionId, schema);
        if (!payment) {
            throw ApiError.notFound('Receipt not found');
        }

        return payment;
    }

    // Dues & Summary
    async getStudentDues(studentId: string, academicYearId: string, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(studentId, 'Student id is required');
        this.ensureUuid(academicYearId, 'Academic year id is required');
        return feeRepository.getStudentDues(studentId, academicYearId, schema);
    }

    async getFeeSummary(academicYearId: string, classId: string | undefined, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(academicYearId, 'Academic year id is required');
        if (classId) {
            this.ensureUuid(classId, 'Class id must be a valid UUID');
        }
        return feeRepository.getFeeSummary(academicYearId, classId, schema);
    }

    // Discounts
    async getDiscounts(schema: string) {
        this.ensureSchema(schema);
        return feeRepository.findAllDiscounts(schema);
    }

    async createDiscount(input: CreateDiscountInput, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(input.institutionId, 'Institution id is required');

        const name = input.name?.trim();
        if (!name) {
            throw ApiError.badRequest('Discount name is required');
        }

        this.validateDiscountType(input.discountType);
        const discountValue = this.ensurePositiveNumber(input.discountValue, 'Discount value must be greater than 0');

        if (input.discountType === FeeDiscountType.PERCENTAGE && discountValue.gt(100)) {
            throw ApiError.badRequest('Percentage discount cannot exceed 100');
        }

        return sequelize.transaction(async (tx) => {
            const existing = await feeRepository.findDiscountByName(input.institutionId, name, schema);
            if (existing) {
                throw ApiError.conflict('Discount with same name already exists');
            }

            const payload: CreateDiscountData = {
                institution_id: input.institutionId,
                name,
                discount_type: input.discountType,
                discount_value: toMoneyString(discountValue),
                is_active: input.isActive,
            };

            return feeRepository.createDiscount(payload, schema, tx);
        });
    }

    async updateDiscount(id: string, input: UpdateDiscountInput, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Discount id is required');

        if (!Object.keys(input).length) {
            throw ApiError.badRequest('At least one field is required for update');
        }

        if (input.discountType) {
            this.validateDiscountType(input.discountType);
        }
        if (input.discountValue !== undefined) {
            this.ensurePositiveNumber(input.discountValue, 'Discount value must be greater than 0');
        }

        return sequelize.transaction(async (tx) => {
            const existing = await feeRepository.findDiscountById(id, schema);
            if (!existing) {
                throw ApiError.notFound('Fee discount not found');
            }

            const nextName = input.name?.trim();
            if (nextName && nextName !== existing.name) {
                const duplicate = await feeRepository.findDiscountByName(existing.institution_id, nextName, schema);
                if (duplicate && duplicate.id !== existing.id) {
                    throw ApiError.conflict('Discount with same name already exists');
                }
            }

            const nextType = input.discountType || existing.discount_type;
            const nextValue = input.discountValue !== undefined
                ? this.ensurePositiveNumber(input.discountValue, 'Discount value must be greater than 0')
                : toMoneyDecimal(existing.discount_value);

            if (nextType === FeeDiscountType.PERCENTAGE && nextValue.gt(100)) {
                throw ApiError.badRequest('Percentage discount cannot exceed 100');
            }

            const payload: UpdateDiscountData = {
                ...(input.name !== undefined ? { name: nextName } : {}),
                ...(input.discountType !== undefined ? { discount_type: input.discountType } : {}),
                ...(input.discountValue !== undefined
                    ? { discount_value: toMoneyString(this.ensurePositiveNumber(input.discountValue, 'Discount value must be greater than 0')) }
                    : {}),
                ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
            };

            return feeRepository.updateDiscount(id, payload, schema, tx);
        });
    }

    async deleteDiscount(id: string, schema: string) {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Discount id is required');

        return sequelize.transaction(async (tx) => {
            await feeRepository.deleteDiscount(id, schema, tx);
            return { deleted: true };
        });
    }

    async applyDiscount(
        studentId: string,
        feeStructureId: string,
        academicYearId: string,
        discountId: string | undefined,
        discountOverrideAmount: number | undefined,
        schema: string,
    ) {
        this.ensureSchema(schema);
        this.ensureUuid(studentId, 'Student id is required');
        this.ensureUuid(feeStructureId, 'Fee structure id is required');
        this.ensureUuid(academicYearId, 'Academic year id is required');

        if (!discountId && discountOverrideAmount === undefined) {
            throw ApiError.badRequest('Either discountId or discountOverrideAmount is required');
        }

        if (discountId) {
            this.ensureUuid(discountId, 'Discount id must be a valid UUID');
        }

        if (discountOverrideAmount !== undefined) {
            this.validateNonNegative(discountOverrideAmount, 'Discount override amount cannot be negative');
        }

        return sequelize.transaction(async (tx) => {
            const assignment = await feeRepository.findAssignment(
                studentId,
                feeStructureId,
                academicYearId,
                schema,
            );

            if (!assignment) {
                throw ApiError.notFound('Fee assignment not found');
            }

            const baseAmount = assignment.fee_structure
                ? assignment.fee_structure.amount
                : assignment.final_amount;

            const discount = await this.resolveDiscount(discountId, schema);
            const computed = this.computeDiscountApplication(baseAmount, discount, discountOverrideAmount);

            return feeRepository.updateAssignment(
                assignment.id,
                {
                    discount_id: computed.discountId,
                    discount_override_amount: computed.discountOverrideAmount,
                    final_amount: computed.finalAmount,
                },
                schema,
                tx,
            );
        });
    }

    private async getStructureForAssignment(
        structureId: string,
        institutionId: string,
        academicYearId: string,
        classId: string,
        schema: string,
    ): Promise<FeeStructure> {
        const structure = await feeRepository.findStructureById(structureId, schema);
        if (!structure) {
            throw ApiError.badRequest(`Fee structure ${structureId} does not exist`);
        }

        if (structure.institution_id !== institutionId) {
            throw ApiError.badRequest(`Fee structure ${structureId} institution mismatch`);
        }

        if (structure.academic_year_id !== academicYearId) {
            throw ApiError.badRequest(`Fee structure ${structureId} academic year mismatch`);
        }

        if (structure.class_id !== classId) {
            throw ApiError.badRequest(`Fee structure ${structureId} does not belong to student's class`);
        }

        if (!structure.is_active) {
            throw ApiError.badRequest(`Fee structure ${structureId} is inactive`);
        }

        return structure;
    }

    private async resolveDiscount(discountId: string | undefined, schema: string) {
        if (!discountId) return null;

        this.ensureUuid(discountId, 'Discount id must be a valid UUID');
        const discount = await feeRepository.findDiscountById(discountId, schema);

        if (!discount) {
            throw ApiError.badRequest('Discount not found');
        }

        if (!discount.is_active) {
            throw ApiError.badRequest('Discount is inactive');
        }

        return discount;
    }

    private computeDiscountApplication(
        baseAmount: string | number | null | undefined,
        discount: Awaited<ReturnType<FeeService['resolveDiscount']>>,
        discountOverrideAmount?: number,
    ): DiscountApplicationResult {
        const normalizedBase = maxDecimal(0, baseAmount);

        let calculatedDiscount = toMoneyDecimal(0);
        if (discount) {
            const value = toMoneyDecimal(discount.discount_value);
            if (discount.discount_type === FeeDiscountType.PERCENTAGE) {
                calculatedDiscount = toMoneyDecimal(normalizedBase.mul(value).div(100));
            } else {
                calculatedDiscount = value;
            }
        }

        const appliedOverride = discountOverrideAmount !== undefined
            ? this.ensureNonNegativeMoney(discountOverrideAmount, 'Discount override amount cannot be negative')
            : undefined;

        const finalDiscount = appliedOverride !== undefined
            ? appliedOverride
            : calculatedDiscount;

        const boundedDiscount = minDecimal(normalizedBase, finalDiscount);
        const finalAmount = toMoneyString(normalizedBase.minus(boundedDiscount));

        return {
            discountId: discount?.id,
            discountOverrideAmount: appliedOverride ? toMoneyString(appliedOverride) : undefined,
            finalAmount,
        };
    }

    private ensureSchema(schema: string) {
        if (!schema || typeof schema !== 'string') {
            throw ApiError.badRequest('Tenant schema is required');
        }
    }

    private ensureUuid(value: string, message: string) {
        if (!value || !this.isUuid(value)) {
            throw ApiError.badRequest(message);
        }
    }

    private ensureUniqueStructureIds(values: string[] | undefined): string[] | undefined {
        if (values === undefined) {
            return undefined;
        }

        if (!Array.isArray(values) || values.length === 0) {
            throw ApiError.badRequest('feeStructureIds must contain at least one fee structure id when provided');
        }

        const unique = Array.from(new Set(values));
        unique.forEach((id) => this.ensureUuid(id, `Invalid fee structure id: ${id}`));
        return unique;
    }

    private ensurePositiveNumber(value: number, message: string) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            throw ApiError.badRequest(message);
        }
        const normalized = toMoneyDecimal(value);
        if (!normalized.isFinite() || normalized.lte(0)) {
            throw ApiError.badRequest(message);
        }
        return normalized;
    }

    private ensureNonNegativeMoney(value: number, message: string) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            throw ApiError.badRequest(message);
        }
        const normalized = toMoneyDecimal(value);
        if (!normalized.isFinite() || normalized.lt(0)) {
            throw ApiError.badRequest(message);
        }
        return normalized;
    }

    private validateNonNegative(value: number | undefined, message: string) {
        if (value === undefined) return;
        this.ensureNonNegativeMoney(value, message);
    }

    private validateDueDay(value: number | undefined) {
        if (value === undefined) return;
        if (!Number.isInteger(value) || value < 1 || value > 31) {
            throw ApiError.badRequest('Due day must be an integer between 1 and 31');
        }
    }

    private validateFrequency(frequency: string) {
        if (!Object.values(FeeFrequency).includes(frequency as FeeFrequency)) {
            throw ApiError.badRequest('Invalid fee frequency');
        }
    }

    private validatePaymentMode(mode: string) {
        if (!Object.values(FeePaymentMode).includes(mode as FeePaymentMode)) {
            throw ApiError.badRequest('Invalid payment mode');
        }
    }

    private validateDiscountType(type: string) {
        if (!Object.values(FeeDiscountType).includes(type as FeeDiscountType)) {
            throw ApiError.badRequest('Invalid discount type');
        }
    }

    private calculateLateFee(
        lateFeePerDay: string | number | null | undefined,
        dueDay: number | undefined,
        paymentDate: string,
    ): { amount: ReturnType<typeof toDecimal>; lateDays: number } {
        const normalizedLateFee = toMoneyDecimal(lateFeePerDay);
        if (!dueDay || dueDay < 1 || dueDay > 31 || normalizedLateFee.lte(0)) {
            return { amount: toMoneyDecimal(0), lateDays: 0 };
        }

        const payment = this.parseDateOnly(paymentDate);
        const year = payment.getUTCFullYear();
        const month = payment.getUTCMonth();
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const effectiveDueDay = Math.min(dueDay, daysInMonth);
        const dueDate = new Date(Date.UTC(year, month, effectiveDueDay));

        if (payment.getTime() <= dueDate.getTime()) {
            return { amount: toMoneyDecimal(0), lateDays: 0 };
        }

        const lateDays = Math.floor((payment.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = toMoneyDecimal(normalizedLateFee.mul(lateDays));
        return { amount, lateDays };
    }

    private mergeRemarks(
        remarks: string | undefined,
        lateFee: { amount: ReturnType<typeof toDecimal>; lateDays: number },
    ): string | undefined {
        const trimmed = remarks?.trim();
        if (lateFee.amount.lte(0)) {
            return trimmed || undefined;
        }

        const lateFeeNote = `Late fee applied: ${toMoneyString(lateFee.amount)} (${lateFee.lateDays} day${lateFee.lateDays === 1 ? '' : 's'})`;
        return [trimmed, lateFeeNote].filter(Boolean).join(' | ');
    }

    private parseDateOnly(value: string): Date {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) {
            throw ApiError.badRequest('Invalid payment date');
        }
        return parsed;
    }

    private isUuid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }
}

export const feeService = new FeeService();
