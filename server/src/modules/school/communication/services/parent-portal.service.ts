/**
 * Parent Portal Service
 * Provides read-only access for parents to view their child's data
 * 
 * IMPORTANT: Enforces strict parent-child isolation - no cross-child access allowed
 */
import { sequelize } from '../../../../database/sequelize';
import { ApiError } from '../../../../core/http/ApiError';
import { communicationService } from './communication.service';
import { TargetAudience } from '../../../../database/models/school/communication/Notice.model';
import { ParentPortalAccess } from '../../../../database/models/school/communication/ParentPortalAccess.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { StudentEnrollment } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import { StudentAttendance } from '../../../../database/models/school/attendance/StudentAttendance.model';
import { FeePayment } from '../../../../database/models/school/fees/FeePayment.model';
import { FeeStructure } from '../../../../database/models/school/fees/FeeStructure.model';
import { Mark } from '../../../../database/models/school/examination/Mark.model';
import { Exam } from '../../../../database/models/school/examination/Exam.model';
import { ExamSchedule } from '../../../../database/models/school/examination/ExamSchedule.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../database/models/school/academics/class/Section.model';
import { Subject } from '../../../../database/models/school/academics/curriculum/Subject.model';
import { User } from '../../../../database/models/shared/core/User.model';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParentChildInfo {
    id: string;
    firstName: string;
    lastName: string;
    rollNumber?: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    relationship: string;
    isPrimary: boolean;
}

export interface AttendanceRecord {
    date: Date;
    status: string;
    remarks?: string;
}

export interface FeeRecord {
    id: string;
    receiptNumber?: string;
    amountPaid: number;
    paymentDate: string;
    paymentMode: string;
    paymentReference?: string;
    status: string;
    remarks?: string;
    feeName?: string;
    academicYear?: string;
}

export interface MarksRecord {
    id: string;
    examName?: string;
    subjectName?: string;
    marksObtained?: number;
    maxMarks?: number;
    grade?: string;
    remarks?: string;
    examDate?: string;
}

export interface ParentNoticeRecord {
    id: string;
    title: string;
    content: string;
    noticeType: string;
    publishedAt?: Date;
    expiresAt?: Date;
    isPinned: boolean;
}

// ─── Parent Portal Service ───────────────────────────────────────────────────

export class ParentPortalService {
    /**
     * Get all children linked to a parent user
     */
    async getParentChildren(parentUserId: string, schema: string, institutionId: string): Promise<ParentChildInfo[]> {
        this.ensureSchema(schema);
        this.ensureUuid(parentUserId, 'Parent user ID is required');

        const accessRecords = await ParentPortalAccess.schema(schema).findAll({
            where: { parent_user_id: parentUserId },
            include: [
                {
                    model: Student.schema(schema),
                    as: 'student',
                    include: [
                        {
                            model: User.schema(schema),
                            as: 'user',
                            attributes: ['id', 'first_name', 'last_name'],
                        },
                    ],
                },
            ],
        });

        const children: ParentChildInfo[] = [];

        for (const access of accessRecords) {
            const student = access.student;
            if (!student) continue;

            // Get active enrollment
            const enrollment = await StudentEnrollment.schema(schema).findOne({
                where: { student_id: student.id, institution_id: institutionId, status: 'active' },
                include: [
                    { model: Class.schema(schema), as: 'class', attributes: ['id', 'name'] },
                    { model: Section.schema(schema), as: 'section', attributes: ['id', 'name'] },
                ],
            });

            children.push({
                id: student.id,
                firstName: student.user?.first_name || '',
                lastName: student.user?.last_name || '',
                rollNumber: enrollment?.roll_number,
                admissionNumber: student.admission_number,
                className: enrollment?.class?.name,
                sectionName: enrollment?.section?.name,
                relationship: access.relationship,
                isPrimary: access.is_primary,
            });
        }

        return children;
    }

    /**
     * Get attendance records for a student (with parent access verification)
     */
    async getStudentAttendance(
        parentUserId: string,
        studentId: string,
        schema: string,
        institutionId: string
    ): Promise<AttendanceRecord[]> {
        this.ensureSchema(schema);
        this.ensureUuid(parentUserId, 'Parent user ID is required');
        this.ensureUuid(studentId, 'Student ID is required');

        // Verify parent has access to this student (with attendance permission)
        await communicationService.verifyParentAccess(parentUserId, studentId, schema, institutionId, 'attendance');

        const records = await StudentAttendance.schema(schema).findAll({
            where: { student_id: studentId, institution_id: institutionId },
            order: [['date', 'DESC']],
            limit: 90,
        });

        return records.map((record) => ({
            date: record.date,
            status: record.status,
            remarks: record.remark,
        }));
    }

    /**
     * Get fee records for a student (with parent access verification)
     */
    async getStudentFees(
        parentUserId: string,
        studentId: string,
        schema: string,
        institutionId: string
    ): Promise<FeeRecord[]> {
        this.ensureSchema(schema);
        this.ensureUuid(parentUserId, 'Parent user ID is required');
        this.ensureUuid(studentId, 'Student ID is required');

        // Verify parent has access to this student (with fees permission)
        await communicationService.verifyParentAccess(parentUserId, studentId, schema, institutionId, 'fees');

        const payments = await FeePayment.schema(schema).findAll({
            where: { student_id: studentId, institution_id: institutionId },
            include: [
                {
                    model: FeeStructure.schema(schema),
                    as: 'fee_structure',
                    attributes: ['id', 'academic_year_id'],
                },
            ],
            order: [['payment_date', 'DESC']],
        });

        return payments.map((payment) => ({
            id: payment.id,
            receiptNumber: payment.receipt_number,
            amountPaid: payment.amount_paid,
            paymentDate: payment.payment_date instanceof Date
                ? payment.payment_date.toISOString().split('T')[0]
                : String(payment.payment_date),
            paymentMode: payment.payment_mode,
            paymentReference: payment.payment_reference,
            status: payment.status,
            remarks: payment.remarks,
            feeName: payment.fee_structure?.fee_category?.name,
            academicYear: payment.fee_structure?.academic_year_id,
        }));
    }

    /**
     * Get marks records for a student (with parent access verification)
     */
    async getStudentMarks(
        parentUserId: string,
        studentId: string,
        schema: string,
        institutionId: string
    ): Promise<MarksRecord[]> {
        this.ensureSchema(schema);
        this.ensureUuid(parentUserId, 'Parent user ID is required');
        this.ensureUuid(studentId, 'Student ID is required');

        // Verify parent has access to this student (with marks permission)
        await communicationService.verifyParentAccess(parentUserId, studentId, schema, institutionId, 'marks');

        const marks = await Mark.schema(schema).findAll({
            where: { student_id: studentId, institution_id: institutionId },
            include: [
                {
                    model: ExamSchedule.schema(schema),
                    as: 'exam_schedule',
                    attributes: ['id', 'date', 'max_marks'],
                    include: [
                        {
                            model: Subject.schema(schema),
                            as: 'subject',
                            attributes: ['id', 'name'],
                        },
                        {
                            model: Exam.schema(schema),
                            as: 'exam',
                            attributes: ['id', 'name'],
                        },
                    ],
                },
            ],
            order: [[{ model: ExamSchedule, as: 'exam_schedule' }, 'date', 'DESC']],
        });

        return marks.map((mark) => ({
            id: mark.id,
            examName: mark.exam_schedule?.exam?.name,
            subjectName: mark.exam_schedule?.subject?.name,
            marksObtained: mark.marks_obtained,
            maxMarks: mark.exam_schedule?.max_marks,
            grade: mark.grade,
            remarks: mark.remarks,
            examDate: mark.exam_schedule?.date,
        }));
    }

    /**
     * Get notices for parents (targeted at 'all' or 'parents')
     */
    async getParentNotices(schema: string, institutionId: string): Promise<ParentNoticeRecord[]> {
        this.ensureSchema(schema);

        const notices = await communicationService.getPublishedNotices(
            {
                targetAudience: TargetAudience.PARENTS,
                includeCreator: false,
            },
            schema,
            institutionId
        );

        return notices.map((notice) => ({
            id: notice.id,
            title: notice.title,
            content: notice.content,
            noticeType: notice.notice_type,
            publishedAt: notice.published_at,
            expiresAt: notice.expires_at,
            isPinned: notice.is_pinned,
        }));
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private ensureSchema(schema: string): void {
        if (!schema || typeof schema !== 'string') {
            throw ApiError.badRequest('Tenant schema is required');
        }
    }

    private ensureUuid(value: string, message: string): void {
        if (!value || !this.isUuid(value)) {
            throw ApiError.badRequest(message);
        }
    }

    private isUuid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }
}

export const parentPortalService = new ParentPortalService();
