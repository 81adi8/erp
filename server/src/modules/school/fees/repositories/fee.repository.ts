import { CreationAttributes, Op, Transaction } from 'sequelize';
import { sequelize } from '../../../../database/sequelize';
import { ApiError } from '../../../../core/http/ApiError';
import { Institution } from '../../../../database/models/public/Institution.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import {
    StudentEnrollment,
    StudentEnrollmentStatus,
} from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import { FeeCategory } from '../../../../database/models/school/fees/FeeCategory.model';
import { FeeStructure } from '../../../../database/models/school/fees/FeeStructure.model';
import { FeeDiscount } from '../../../../database/models/school/fees/FeeDiscount.model';
import {
    FeePayment,
    FeePaymentStatus,
} from '../../../../database/models/school/fees/FeePayment.model';
import { StudentFeeAssignment } from '../../../../database/models/school/fees/StudentFeeAssignment.model';
import { maxDecimal, toDecimal, toMoneyDecimal, toMoneyNumber, toMoneyString } from '../utils/money';

export interface FeeDuesBreakdownItem {
    feeCategory: string;
    assigned: number;
    paid: number;
    outstanding: number;
}

export interface FeeDuesSummary {
    totalAssigned: number;
    totalPaid: number;
    outstanding: number;
    breakdown: FeeDuesBreakdownItem[];
}

export interface CreateCategoryData {
    institution_id: string;
    academic_year_id: string;
    name: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateCategoryData {
    name?: string;
    description?: string;
    is_active?: boolean;
}

export interface CreateStructureData {
    institution_id: string;
    academic_year_id: string;
    fee_category_id: string;
    class_id: string;
    amount: string;
    frequency: 'monthly' | 'quarterly' | 'annually' | 'one_time';
    due_day?: number;
    late_fee_per_day?: string;
    is_active?: boolean;
}

export interface UpdateStructureData {
    fee_category_id?: string;
    class_id?: string;
    amount?: string;
    frequency?: 'monthly' | 'quarterly' | 'annually' | 'one_time';
    due_day?: number;
    late_fee_per_day?: string;
    is_active?: boolean;
}

export interface CreateAssignmentData {
    institution_id: string;
    student_id: string;
    fee_structure_id: string;
    academic_year_id: string;
    discount_id?: string;
    discount_override_amount?: string;
    final_amount: string;
}

export interface CreatePaymentData {
    institution_id: string;
    student_id: string;
    academic_year_id: string;
    receipt_number: string;
    payment_date: string;
    amount_paid: string;
    payment_mode: 'cash' | 'cheque' | 'online' | 'upi' | 'dd';
    payment_reference?: string;
    fee_structure_id: string;
    collected_by?: string;
    remarks?: string;
    status: 'success' | 'pending' | 'failed' | 'refunded';
    // FEE-01 FIX: Added idempotency_key
    idempotency_key?: string;
}

export interface PaymentListFilters {
    academicYearId?: string;
    studentId?: string;
    status?: string;
    from?: string;
    to?: string;
}

export interface FindStructuresFilters {
    academicYearId: string;
    classId?: string;
}

export interface CreateDiscountData {
    institution_id: string;
    name: string;
    discount_type: 'percentage' | 'flat';
    discount_value: string;
    is_active?: boolean;
}

export interface UpdateDiscountData {
    name?: string;
    discount_type?: 'percentage' | 'flat';
    discount_value?: string;
    is_active?: boolean;
}

export interface UpdateAssignmentData {
    discount_id?: string;
    discount_override_amount?: string;
    final_amount?: string;
}

export interface FeeSummaryBreakdown {
    feeCategory: string;
    assigned: number;
    collected: number;
    outstanding: number;
}

export interface FeeSummaryResult {
    totalAssigned: number;
    totalCollected: number;
    outstanding: number;
    collectionPercentage: number;
    breakdown: FeeSummaryBreakdown[];
}

export class FeeRepository {
    private categoryModel(schema: string) {
        return FeeCategory.schema(schema);
    }

    private structureModel(schema: string) {
        return FeeStructure.schema(schema);
    }

    private discountModel(schema: string) {
        return FeeDiscount.schema(schema);
    }

    private assignmentModel(schema: string) {
        return StudentFeeAssignment.schema(schema);
    }

    private paymentModel(schema: string) {
        return FeePayment.schema(schema);
    }

    private enrollmentModel(schema: string) {
        return StudentEnrollment.schema(schema);
    }

    private studentModel(schema: string) {
        return Student.schema(schema);
    }

    private classModel(schema: string) {
        return Class.schema(schema);
    }

    // Fee Category
    async findAllCategories(academicYearId: string, schema: string): Promise<FeeCategory[]> {
        return this.categoryModel(schema).findAll({
            where: { academic_year_id: academicYearId },
            order: [['name', 'ASC']],
        });
    }

    async findCategoryByName(
        institutionId: string,
        academicYearId: string,
        name: string,
        schema: string,
    ): Promise<FeeCategory | null> {
        return this.categoryModel(schema).findOne({
            where: {
                institution_id: institutionId,
                academic_year_id: academicYearId,
                name,
            },
        });
    }

    async createCategory(
        data: CreateCategoryData,
        schema: string,
        transaction: Transaction,
    ): Promise<FeeCategory> {
        return this.categoryModel(schema).create(
            data as unknown as CreationAttributes<FeeCategory>,
            { transaction },
        );
    }

    async findCategoryById(id: string, schema: string): Promise<FeeCategory | null> {
        return this.categoryModel(schema).findByPk(id);
    }

    async updateCategory(
        id: string,
        data: UpdateCategoryData,
        schema: string,
        transaction: Transaction,
    ): Promise<FeeCategory> {
        const category = await this.findCategoryById(id, schema);
        if (!category) {
            throw ApiError.notFound('Fee category not found');
        }

        await category.update(data, { transaction });
        return category;
    }

    async deleteCategory(id: string, schema: string, transaction: Transaction): Promise<void> {
        const category = await this.findCategoryById(id, schema);
        if (!category) {
            throw ApiError.notFound('Fee category not found');
        }
        await category.destroy({ transaction });
    }

    // Fee Structure
    async findAllStructures(filters: FindStructuresFilters, schema: string): Promise<FeeStructure[]> {
        return this.structureModel(schema).findAll({
            where: {
                academic_year_id: filters.academicYearId,
                ...(filters.classId ? { class_id: filters.classId } : {}),
            },
            include: [{
                model: this.categoryModel(schema),
                as: 'fee_category',
            }],
            order: [['createdAt', 'DESC']],
        });
    }

    async findStructureByComposite(
        institutionId: string,
        academicYearId: string,
        feeCategoryId: string,
        classId: string,
        schema: string,
    ): Promise<FeeStructure | null> {
        return this.structureModel(schema).findOne({
            where: {
                institution_id: institutionId,
                academic_year_id: academicYearId,
                fee_category_id: feeCategoryId,
                class_id: classId,
            },
        });
    }

    async createStructure(
        data: CreateStructureData,
        schema: string,
        transaction: Transaction,
    ): Promise<FeeStructure> {
        return this.structureModel(schema).create(
            data as unknown as CreationAttributes<FeeStructure>,
            { transaction },
        );
    }

    async findStructureById(id: string, schema: string): Promise<FeeStructure | null> {
        return this.structureModel(schema).findByPk(id, {
            include: [{
                model: this.categoryModel(schema),
                as: 'fee_category',
            }],
        });
    }

    async updateStructure(
        id: string,
        data: UpdateStructureData,
        schema: string,
        transaction: Transaction,
    ): Promise<FeeStructure> {
        const structure = await this.findStructureById(id, schema);
        if (!structure) {
            throw ApiError.notFound('Fee structure not found');
        }

        await structure.update(data, { transaction });
        return structure;
    }

    async deleteStructure(id: string, schema: string, transaction: Transaction): Promise<void> {
        const structure = await this.findStructureById(id, schema);
        if (!structure) {
            throw ApiError.notFound('Fee structure not found');
        }
        await structure.destroy({ transaction });
    }

    async findStructuresByClass(
        classId: string,
        academicYearId: string,
        schema: string,
    ): Promise<FeeStructure[]> {
        return this.structureModel(schema).findAll({
            where: {
                class_id: classId,
                academic_year_id: academicYearId,
                is_active: true,
            },
            include: [{
                model: this.categoryModel(schema),
                as: 'fee_category',
            }],
            order: [['createdAt', 'DESC']],
        });
    }

    // Fee Assignment
    async assignFeeToStudent(
        data: CreateAssignmentData,
        schema: string,
        transaction: Transaction,
    ): Promise<StudentFeeAssignment> {
        return this.assignmentModel(schema).create(
            data as unknown as CreationAttributes<StudentFeeAssignment>,
            { transaction },
        );
    }

    // FEE-02 FIX: Find assignment with row-level lock for concurrent payment protection
    async findAssignmentWithLock(
        studentId: string,
        feeStructureId: string,
        academicYearId: string,
        schema: string,
        transaction: Transaction,
    ): Promise<StudentFeeAssignment | null> {
        return this.assignmentModel(schema).findOne({
            where: {
                student_id: studentId,
                fee_structure_id: feeStructureId,
                academic_year_id: academicYearId,
            },
            lock: transaction.LOCK.UPDATE,
            transaction,
            include: [
                {
                    model: this.structureModel(schema),
                    as: 'fee_structure',
                    include: [{ model: this.categoryModel(schema), as: 'fee_category' }],
                },
                {
                    model: this.discountModel(schema),
                    as: 'discount',
                },
            ],
        });
    }

    async findAssignment(
        studentId: string,
        feeStructureId: string,
        academicYearId: string,
        schema: string,
    ): Promise<StudentFeeAssignment | null> {
        return this.assignmentModel(schema).findOne({
            where: {
                student_id: studentId,
                fee_structure_id: feeStructureId,
                academic_year_id: academicYearId,
            },
            include: [
                {
                    model: this.structureModel(schema),
                    as: 'fee_structure',
                    include: [{ model: this.categoryModel(schema), as: 'fee_category' }],
                },
                {
                    model: this.discountModel(schema),
                    as: 'discount',
                },
            ],
        });
    }

    async findLatestAssignmentByStudentAndStructure(
        studentId: string,
        feeStructureId: string,
        schema: string,
    ): Promise<StudentFeeAssignment | null> {
        return this.assignmentModel(schema).findOne({
            where: {
                student_id: studentId,
                fee_structure_id: feeStructureId,
            },
            include: [
                {
                    model: this.structureModel(schema),
                    as: 'fee_structure',
                    include: [{ model: this.categoryModel(schema), as: 'fee_category' }],
                },
                {
                    model: this.discountModel(schema),
                    as: 'discount',
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async getStudentAssignments(
        studentId: string,
        academicYearId: string,
        schema: string,
    ): Promise<StudentFeeAssignment[]> {
        return this.assignmentModel(schema).findAll({
            where: {
                student_id: studentId,
                academic_year_id: academicYearId,
            },
            include: [
                {
                    model: this.structureModel(schema),
                    as: 'fee_structure',
                    include: [{ model: this.categoryModel(schema), as: 'fee_category' }],
                },
                {
                    model: this.discountModel(schema),
                    as: 'discount',
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async findStudentAssignmentsByStructures(
        studentId: string,
        academicYearId: string,
        structureIds: string[],
        schema: string,
    ): Promise<StudentFeeAssignment[]> {
        return this.assignmentModel(schema).findAll({
            where: {
                student_id: studentId,
                academic_year_id: academicYearId,
                fee_structure_id: { [Op.in]: structureIds },
            },
        });
    }

    async updateAssignment(
        id: string,
        data: UpdateAssignmentData,
        schema: string,
        transaction: Transaction,
    ): Promise<StudentFeeAssignment> {
        const assignment = await this.assignmentModel(schema).findByPk(id);
        if (!assignment) {
            throw ApiError.notFound('Fee assignment not found');
        }

        await assignment.update(data, { transaction });
        return assignment;
    }

    async bulkAssignFeeToClass(
        classId: string,
        academicYearId: string,
        schema: string,
        transaction: Transaction,
    ): Promise<void> {
        const enrollments = await this.enrollmentModel(schema).findAll({
            where: {
                class_id: classId,
                academic_year_id: academicYearId,
                status: StudentEnrollmentStatus.ACTIVE,
            },
            transaction,
        });

        if (enrollments.length === 0) {
            return;
        }

        const structures = await this.findStructuresByClass(classId, academicYearId, schema);
        if (structures.length === 0) {
            return;
        }

        const assignments: CreateAssignmentData[] = [];

        for (const enrollment of enrollments) {
            for (const structure of structures) {
                assignments.push({
                    institution_id: enrollment.institution_id,
                    student_id: enrollment.student_id,
                    fee_structure_id: structure.id,
                    academic_year_id: academicYearId,
                    final_amount: toMoneyString(structure.amount),
                });
            }
        }

        if (assignments.length > 0) {
            await this.assignmentModel(schema).bulkCreate(
                assignments as unknown as Array<CreationAttributes<StudentFeeAssignment>>,
                {
                    transaction,
                    ignoreDuplicates: true,
                },
            );
        }
    }

    // Payments

    // FEE-01 FIX: Method to find payment by idempotency key for duplicate prevention
    async findPaymentByIdempotencyKey(idempotencyKey: string, schema: string): Promise<FeePayment | null> {
        return this.paymentModel(schema).findOne({
            where: { idempotency_key: idempotencyKey },
        });
    }

    // FEE-04 FIX: Find payment by ID with optional lock for updates
    async findPaymentById(paymentId: string, schema: string, transaction?: Transaction): Promise<FeePayment | null> {
        return this.paymentModel(schema).findByPk(paymentId, {
            ...(transaction && { lock: transaction.LOCK.UPDATE }),
            transaction,
        });
    }

    // FEE-04 FIX: Update payment status (for refunds)
    async updatePaymentStatus(
        paymentId: string,
        data: { status?: string; voided_by?: string; remarks?: string },
        schema: string,
        transaction: Transaction,
    ): Promise<[number]> {
        return this.paymentModel(schema).update(data, {
            where: { id: paymentId },
            transaction,
        });
    }

    async createPayment(
        data: CreatePaymentData,
        schema: string,
        transaction: Transaction,
    ): Promise<FeePayment> {
        return this.paymentModel(schema).create(
            data as unknown as CreationAttributes<FeePayment>,
            { transaction },
        );
    }

    async findPayments(filters: PaymentListFilters, schema: string): Promise<FeePayment[]> {
        return this.paymentModel(schema).findAll({
            where: {
                ...(filters.academicYearId ? { academic_year_id: filters.academicYearId } : {}),
                ...(filters.studentId ? { student_id: filters.studentId } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...((filters.from || filters.to)
                    ? {
                        payment_date: {
                            ...(filters.from ? { [Op.gte]: filters.from } : {}),
                            ...(filters.to ? { [Op.lte]: filters.to } : {}),
                        },
                    }
                    : {}),
            },
            include: [
                {
                    model: this.studentModel(schema),
                    as: 'student',
                },
                {
                    model: this.structureModel(schema),
                    as: 'fee_structure',
                    include: [{ model: this.categoryModel(schema), as: 'fee_category' }],
                },
            ],
            order: [['payment_date', 'DESC'], ['createdAt', 'DESC']],
        });
    }

    async findPaymentsByStudent(
        studentId: string,
        academicYearId: string,
        schema: string,
    ): Promise<FeePayment[]> {
        return this.paymentModel(schema).findAll({
            where: {
                student_id: studentId,
                academic_year_id: academicYearId,
            },
            include: [{
                model: this.structureModel(schema),
                as: 'fee_structure',
                include: [{ model: this.categoryModel(schema), as: 'fee_category' }],
            }],
            order: [['payment_date', 'DESC'], ['createdAt', 'DESC']],
        });
    }

    async findPaymentByReceiptNumber(
        receiptNumber: string,
        institutionId: string,
        schema: string,
    ): Promise<FeePayment | null> {
        return this.paymentModel(schema).findOne({
            where: {
                institution_id: institutionId,
                receipt_number: receiptNumber,
            },
            include: [
                {
                    model: this.studentModel(schema),
                    as: 'student',
                },
                {
                    model: this.structureModel(schema),
                    as: 'fee_structure',
                    include: [{ model: this.categoryModel(schema), as: 'fee_category' }],
                },
            ],
        });
    }

    async generateReceiptNumber(
        institutionId: string,
        schema: string,
        transaction?: Transaction,
    ): Promise<string> {
        const generate = async (tx: Transaction): Promise<string> => {
            const institution = await Institution.findByPk(institutionId, {
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });

            if (!institution) {
                throw ApiError.notFound('Institution not found for receipt generation');
            }

            const year = new Date().getFullYear();
            const pattern = `RCP-${year}-%`;

            const lastPayment = await this.paymentModel(schema).findOne({
                where: {
                    institution_id: institutionId,
                    receipt_number: { [Op.like]: pattern },
                },
                order: [['receipt_number', 'DESC']],
                transaction: tx,
                lock: tx.LOCK.UPDATE,
                paranoid: false,
            });

            const nextSequence = (() => {
                if (!lastPayment?.receipt_number) return 1;
                const parts = lastPayment.receipt_number.split('-');
                const last = Number.parseInt(parts[2] || '0', 10);
                return Number.isNaN(last) ? 1 : last + 1;
            })();

            return `RCP-${year}-${String(nextSequence).padStart(5, '0')}`;
        };

        if (transaction) {
            return generate(transaction);
        }

        return sequelize.transaction(async (tx) => generate(tx));
    }

    // Dues
    async getStudentDues(
        studentId: string,
        academicYearId: string,
        schema: string,
    ): Promise<FeeDuesSummary> {
        const assignments = await this.getStudentAssignments(studentId, academicYearId, schema);
        const payments = await this.findPaymentsByStudent(studentId, academicYearId, schema);

        const assignedByCategory = new Map<string, ReturnType<typeof toDecimal>>();
        const paidByCategory = new Map<string, ReturnType<typeof toDecimal>>();

        let totalAssigned = toMoneyDecimal(0);
        let totalPaid = toMoneyDecimal(0);

        for (const assignment of assignments) {
            const amount = toMoneyDecimal(assignment.final_amount);
            totalAssigned = toMoneyDecimal(totalAssigned.plus(amount));

            const categoryName = assignment.fee_structure?.fee_category?.name || 'Uncategorized';
            const existingAssigned = assignedByCategory.get(categoryName) ?? toMoneyDecimal(0);
            assignedByCategory.set(categoryName, toMoneyDecimal(existingAssigned.plus(amount)));
        }

        for (const payment of payments) {
            if (payment.status !== FeePaymentStatus.SUCCESS) {
                continue;
            }

            const amount = toMoneyDecimal(payment.amount_paid);
            totalPaid = toMoneyDecimal(totalPaid.plus(amount));

            const categoryName = payment.fee_structure?.fee_category?.name || 'Uncategorized';
            const existingPaid = paidByCategory.get(categoryName) ?? toMoneyDecimal(0);
            paidByCategory.set(categoryName, toMoneyDecimal(existingPaid.plus(amount)));
        }

        const categories = new Set<string>([
            ...assignedByCategory.keys(),
            ...paidByCategory.keys(),
        ]);

        const breakdown: FeeDuesBreakdownItem[] = Array.from(categories).map((feeCategory) => {
            const assigned = assignedByCategory.get(feeCategory) ?? toMoneyDecimal(0);
            const paid = paidByCategory.get(feeCategory) ?? toMoneyDecimal(0);
            const outstanding = maxDecimal(0, assigned.minus(paid));

            return {
                feeCategory,
                assigned: toMoneyNumber(assigned),
                paid: toMoneyNumber(paid),
                outstanding: toMoneyNumber(outstanding),
            };
        });

        return {
            totalAssigned: toMoneyNumber(totalAssigned),
            totalPaid: toMoneyNumber(totalPaid),
            outstanding: toMoneyNumber(maxDecimal(0, totalAssigned.minus(totalPaid))),
            breakdown,
        };
    }

    async getFeeSummary(
        academicYearId: string,
        classId: string | undefined,
        schema: string,
    ): Promise<FeeSummaryResult> {
        const assignments = await this.assignmentModel(schema).findAll({
            where: { academic_year_id: academicYearId },
            include: [{
                model: this.structureModel(schema),
                as: 'fee_structure',
                required: true,
                where: {
                    academic_year_id: academicYearId,
                    ...(classId ? { class_id: classId } : {}),
                },
                include: [{ model: this.categoryModel(schema), as: 'fee_category' }],
            }],
        });

        const payments = await this.paymentModel(schema).findAll({
            where: {
                academic_year_id: academicYearId,
                status: FeePaymentStatus.SUCCESS,
            },
            include: [{
                model: this.structureModel(schema),
                as: 'fee_structure',
                required: true,
                where: {
                    academic_year_id: academicYearId,
                    ...(classId ? { class_id: classId } : {}),
                },
                include: [{ model: this.categoryModel(schema), as: 'fee_category' }],
            }],
        });

        const assignedByCategory = new Map<string, ReturnType<typeof toDecimal>>();
        const collectedByCategory = new Map<string, ReturnType<typeof toDecimal>>();

        let totalAssigned = toMoneyDecimal(0);
        let totalCollected = toMoneyDecimal(0);

        for (const assignment of assignments) {
            const amount = toMoneyDecimal(assignment.final_amount);
            totalAssigned = toMoneyDecimal(totalAssigned.plus(amount));

            const categoryName = assignment.fee_structure?.fee_category?.name || 'Uncategorized';
            const existingAssigned = assignedByCategory.get(categoryName) ?? toMoneyDecimal(0);
            assignedByCategory.set(categoryName, toMoneyDecimal(existingAssigned.plus(amount)));
        }

        for (const payment of payments) {
            const amount = toMoneyDecimal(payment.amount_paid);
            totalCollected = toMoneyDecimal(totalCollected.plus(amount));

            const categoryName = payment.fee_structure?.fee_category?.name || 'Uncategorized';
            const existingCollected = collectedByCategory.get(categoryName) ?? toMoneyDecimal(0);
            collectedByCategory.set(categoryName, toMoneyDecimal(existingCollected.plus(amount)));
        }

        const categories = new Set<string>([
            ...assignedByCategory.keys(),
            ...collectedByCategory.keys(),
        ]);

        const breakdown: FeeSummaryBreakdown[] = Array.from(categories).map((feeCategory) => {
            const assigned = assignedByCategory.get(feeCategory) ?? toMoneyDecimal(0);
            const collected = collectedByCategory.get(feeCategory) ?? toMoneyDecimal(0);

            return {
                feeCategory,
                assigned: toMoneyNumber(assigned),
                collected: toMoneyNumber(collected),
                outstanding: toMoneyNumber(maxDecimal(0, assigned.minus(collected))),
            };
        });

        const outstanding = maxDecimal(0, totalAssigned.minus(totalCollected));
        const collectionPercentage = totalAssigned.gt(0)
            ? toMoneyNumber(totalCollected.div(totalAssigned).mul(100))
            : 0;

        return {
            totalAssigned: toMoneyNumber(totalAssigned),
            totalCollected: toMoneyNumber(totalCollected),
            outstanding: toMoneyNumber(outstanding),
            collectionPercentage,
            breakdown,
        };
    }

    // Discounts
    async createDiscount(
        data: CreateDiscountData,
        schema: string,
        transaction: Transaction,
    ): Promise<FeeDiscount> {
        return this.discountModel(schema).create(
            data as unknown as CreationAttributes<FeeDiscount>,
            { transaction },
        );
    }

    async findAllDiscounts(schema: string): Promise<FeeDiscount[]> {
        return this.discountModel(schema).findAll({
            order: [['name', 'ASC']],
        });
    }

    async findDiscountByName(
        institutionId: string,
        name: string,
        schema: string,
    ): Promise<FeeDiscount | null> {
        return this.discountModel(schema).findOne({
            where: {
                institution_id: institutionId,
                name,
            },
        });
    }

    async findDiscountById(id: string, schema: string): Promise<FeeDiscount | null> {
        return this.discountModel(schema).findByPk(id);
    }

    async updateDiscount(
        id: string,
        data: UpdateDiscountData,
        schema: string,
        transaction: Transaction,
    ): Promise<FeeDiscount> {
        const discount = await this.findDiscountById(id, schema);
        if (!discount) {
            throw ApiError.notFound('Fee discount not found');
        }

        await discount.update(data, { transaction });
        return discount;
    }

    async deleteDiscount(id: string, schema: string, transaction: Transaction): Promise<void> {
        const discount = await this.findDiscountById(id, schema);
        if (!discount) {
            throw ApiError.notFound('Fee discount not found');
        }

        await discount.destroy({ transaction });
    }

    // Shared lookups
    async findStudentById(studentId: string, schema: string): Promise<Student | null> {
        return this.studentModel(schema).findByPk(studentId);
    }

    async findClassById(classId: string, schema: string): Promise<Class | null> {
        return this.classModel(schema).findByPk(classId);
    }

    async findActiveEnrollment(
        studentId: string,
        academicYearId: string,
        schema: string,
    ): Promise<StudentEnrollment | null> {
        return this.enrollmentModel(schema).findOne({
            where: {
                student_id: studentId,
                academic_year_id: academicYearId,
                status: StudentEnrollmentStatus.ACTIVE,
            },
        });
    }

    async findStudentsByClass(
        classId: string,
        academicYearId: string,
        schema: string,
    ): Promise<StudentEnrollment[]> {
        return this.enrollmentModel(schema).findAll({
            where: {
                class_id: classId,
                academic_year_id: academicYearId,
                status: StudentEnrollmentStatus.ACTIVE,
            },
            include: [{
                model: this.studentModel(schema),
                as: 'student',
            }],
            order: [['createdAt', 'ASC']],
        });
    }
}

export const feeRepository = new FeeRepository();
