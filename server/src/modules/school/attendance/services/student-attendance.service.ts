// ============================================================================
// STUDENT ATTENDANCE SERVICE
// Business logic for student attendance with validation and workflow
// ============================================================================

import { Op, Transaction, Sequelize } from 'sequelize';
import { 
    createAttendanceRepositories,
    StudentAttendanceRepository,
    AttendanceSettingsRepository,
    AttendanceAuditRepository,
    AttendanceSummaryRepository,
    LeaveRepository
} from '../repositories/attendance.repository';
import { StudentAttendance } from '../../../../database/models/school/attendance/StudentAttendance.model';
import { AttendanceSettings } from '../../../../database/models/school/attendance/AttendanceSettings.model';
import { AttendanceAuditLog } from '../../../../database/models/school/attendance/AttendanceAuditLog.model';
import { LeaveApplication } from '../../../../database/models/school/attendance/LeaveApplication.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { StudentEnrollment, StudentEnrollmentStatus } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import { SessionHoliday } from '../../../../database/models/school/academics/session/SessionHoliday.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { academicCalendarService } from '../../academic/services/calendar/academic-calendar.service';
import { 
    AttendanceScope,
    AttendanceContext,
    AttendanceMarkResult,
    PaginatedResponse,
    IAttendanceSummary,
    ClassAttendanceSummary,
    SummaryScope,
    SummaryPeriodType,
    AuditAction,
    AuditEntityType,
    AttendanceStatus,
    ATTENDANCE_COUNT_VALUES as STATUS_COUNT_VALUES
} from '../types/attendance.types';
import { 
    MarkAttendanceDto, 
    BulkMarkAttendanceDto, 
    UpdateAttendanceDto,
    AttendanceQueryDto,
    DailyAttendanceQueryDto
} from '../dto/attendance.dto';
import { AttendanceError, AttendanceErrorCodes, createAttendanceError } from '../errors/attendance.error';
import { ATTENDANCE_PERMISSIONS, DEFAULT_ATTENDANCE_CONFIG } from '../constants/attendance.constants';

export class StudentAttendanceService {
    private schemaName: string;
    private institutionId: string;
    private attendanceRepo: StudentAttendanceRepository;
    private settingsRepo: AttendanceSettingsRepository;
    private auditRepo: AttendanceAuditRepository;
    private summaryRepo: AttendanceSummaryRepository;
    private leaveRepo: LeaveRepository;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
        
        const repos = createAttendanceRepositories(schemaName, institutionId);
        this.attendanceRepo = repos.studentAttendance;
        this.settingsRepo = repos.settings;
        this.auditRepo = repos.audit;
        this.summaryRepo = repos.summary;
        this.leaveRepo = repos.leave;
    }

    // =========================================================================
    // VALIDATION HELPERS
    // =========================================================================

    /**
     * Validate date is not in future and respects backdated limits
     */
    private async validateDate(
        date: Date | string,
        academicYearId: string,
        classId?: string
    ): Promise<void> {
        const attendanceDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check for future date
        if (attendanceDate > today) {
            throw createAttendanceError('FUTURE_DATE_NOT_ALLOWED');
        }

        // Get settings to check backdated limits
        const settings = await this.settingsRepo.getSettings(
            AttendanceScope.STUDENT,
            classId
        );

        const config = settings || DEFAULT_ATTENDANCE_CONFIG;
        
        if (!config.allowBackdatedMarking) {
            // Only today allowed
            const daysDiff = Math.floor((today.getTime() - attendanceDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > 0) {
                throw createAttendanceError('BACKDATED_NOT_ALLOWED');
            }
        } else {
            // Check within limit
            const daysDiff = Math.floor((today.getTime() - attendanceDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > config.backdatedDaysLimit) {
                throw createAttendanceError(
                    'BACKDATED_LIMIT_EXCEEDED',
                    `Cannot mark attendance older than ${config.backdatedDaysLimit} days`
                );
            }
        }

        // Check if it's a working day as per Calendar Service
        const dayStatus = await academicCalendarService.getDayStatus(
            this.schemaName,
            this.institutionId,
            attendanceDate,
            academicYearId
        );

        if (dayStatus.status !== 'WORKING') {
            throw createAttendanceError('HOLIDAY_DATE', `Cannot mark attendance: ${dayStatus.name || dayStatus.status}`);
        }

        // Check Academic Session Config
        const { AcademicSession } = require('../../../../database/models/school/academics/session/AcademicSession.model');
        const session = await AcademicSession.schema(this.schemaName).findByPk(academicYearId);
        
        if (!session) {
            throw createAttendanceError('ACADEMIC_YEAR_NOT_FOUND');
        }

        if (session.is_locked || session.is_attendance_locked) {
            throw createAttendanceError('SESSION_LOCKED', 'Attendance is locked for this academic session');
        }

        // Check if date is within session bounds
        const start = new Date(session.start_date);
        const end = new Date(session.end_date);
        if (attendanceDate < start || attendanceDate > end) {
            throw createAttendanceError('OUT_OF_SESSION_RANGE', 'Date is outside the academic session range');
        }
    }

    /**
     * Check if date is a holiday
     */
    private async isHoliday(
        date: Date | string,
        academicYearId: string
    ): Promise<boolean> {
        const { isWorking } = await academicCalendarService.validateWorkingDay(
            this.schemaName,
            this.institutionId,
            date,
            academicYearId
        );
        return !isWorking;
    }

    /**
     * Validate student exists and get their enrollment
     */
    private async validateStudent(
        studentId: string,
        academicYearId: string
    ): Promise<{ student: Student; enrollment: StudentEnrollment }> {
        const enrollment = await StudentEnrollment.schema(this.schemaName).findOne({
            where: {
                institution_id: this.institutionId,
                student_id: studentId,
                academic_year_id: academicYearId,
                status: StudentEnrollmentStatus.ACTIVE
            },
            include: [{
                model: Student.schema(this.schemaName),
                as: 'student',
                include: [{
                    model: User.schema(this.schemaName),
                    as: 'user'
                }]
            }]
        });

        if (!enrollment) {
            throw createAttendanceError('STUDENT_NOT_FOUND', 'Student not enrolled in current academic year');
        }

        return {
            student: enrollment.student,
            enrollment
        };
    }

    /**
     * Check if attendance can be edited (within edit window)
     */
    private async canEdit(
        attendance: StudentAttendance,
        userId: string,
        permissions: string[]
    ): Promise<boolean> {
        // Admin can always edit (with audit)
        if (permissions.includes(ATTENDANCE_PERMISSIONS.STUDENT_EDIT)) {
            return true;
        }

        // Check if locked
        if (attendance.isLocked) {
            throw createAttendanceError('ATTENDANCE_LOCKED');
        }

        // Check edit window
        const settings = await this.settingsRepo.getSettings(
            AttendanceScope.STUDENT,
            attendance.classId
        );

        const editWindowHours = settings?.rules?.editWindowHours ?? 
            DEFAULT_ATTENDANCE_CONFIG.rules.editWindowHours;

        const markedAt = attendance.markedAt || attendance.createdAt;
        const hoursSinceMarked = (Date.now() - new Date(markedAt).getTime()) / (1000 * 60 * 60);

        if (hoursSinceMarked > editWindowHours) {
            throw createAttendanceError('EDIT_WINDOW_EXPIRED');
        }

        return true;
    }

    // =========================================================================
    // CORE OPERATIONS
    // =========================================================================

    /**
     * Mark attendance for a single student
     */
    async markAttendance(
        academicYearId: string,
        dto: MarkAttendanceDto,
        userId: string,
        transaction?: Transaction
    ): Promise<StudentAttendance> {
        // Validate date
        await this.validateDate(dto.date, academicYearId);

        // Check for holiday
        if (await this.isHoliday(dto.date, academicYearId)) {
            throw createAttendanceError('HOLIDAY_DATE');
        }

        // Validate student and get enrollment
        const { enrollment } = await this.validateStudent(dto.entityId, academicYearId);

        // Check for duplicate
        const existingAttendance = await this.attendanceRepo.findByStudentAndDate(
            dto.entityId,
            dto.date,
            dto.periodNumber
        );

        if (existingAttendance) {
            throw createAttendanceError('ATTENDANCE_DUPLICATE');
        }

        // Create attendance record
        const attendance = await this.attendanceRepo.create({
            academicYearId: academicYearId,
            studentId: dto.entityId,
            classId: enrollment.class_id,
            sectionId: enrollment.section_id,
            date: new Date(dto.date),
            status: dto.status,
            periodNumber: dto.periodNumber,
            checkInTime: dto.checkInTime,
            checkOutTime: dto.checkOutTime,
            remark: dto.remark,
            countValue: STATUS_COUNT_VALUES[dto.status],
            markedById: userId,
            markedAt: new Date()
        }, transaction);

        // Log audit
        await this.auditRepo.log({
            entityType: AuditEntityType.STUDENT_ATTENDANCE,
            entityId: attendance.id,
            action: AuditAction.CREATE,
            newValues: {
                studentId: dto.entityId,
                date: dto.date,
                status: dto.status
            },
            changedById: userId
        });

        // Trigger summary recalculation
        await this.summaryRepo.markForRecalculation({
            academicYearId,
            scope: SummaryScope.STUDENT,
            entityId: dto.entityId,
            date: dto.date
        }, transaction);

        await this.summaryRepo.markForRecalculation({
            academicYearId,
            scope: SummaryScope.SECTION,
            entityId: enrollment.section_id,
            date: dto.date
        }, transaction);

        return attendance;
    }

    /**
     * Bulk mark attendance for multiple students
     */
    async bulkMarkAttendance(
        academicYearId: string,
        dto: BulkMarkAttendanceDto,
        userId: string
    ): Promise<AttendanceMarkResult> {
        // 1. Basic Validation
        await this.validateDate(dto.date, academicYearId, dto.classId);

        if (await this.isHoliday(dto.date, academicYearId)) {
            throw createAttendanceError('HOLIDAY_DATE');
        }

        // 2. Fetch all active enrollments and approved leaves in batch
        const studentIds = dto.entries.map(e => e.entityId);
        const [enrollments, leaves] = await Promise.all([
            StudentEnrollment.schema(this.schemaName).findAll({
                where: {
                    institution_id: this.institutionId,
                    academic_year_id: academicYearId,
                    student_id: { [Op.in]: studentIds },
                    status: StudentEnrollmentStatus.ACTIVE
                },
                attributes: ['student_id', 'class_id', 'section_id']
            }),
            this.leaveRepo.getApprovedLeavesForDate(studentIds, dto.date)
        ]);

        const enrollmentMap = new Map(enrollments.map(e => [e.student_id, e]));
        const leaveMap = new Map<string, LeaveApplication>(leaves.map((leave) => [leave.entityId, leave]));

        // 3. Prepare records for bulk create
        const recordsToCreate: Array<Partial<StudentAttendance>> = [];
        const result: AttendanceMarkResult = {
            success: true,
            markedCount: 0,
            skippedCount: 0,
            errors: []
        };

        for (const entry of dto.entries) {
            const enrollment = enrollmentMap.get(entry.entityId);
            
            if (!enrollment) {
                result.skippedCount++;
                result.errors?.push({
                    entityId: entry.entityId,
                    error: 'Student not enrolled or not in this class/section'
                });
                continue;
            }

            // Auto-override status if student is on approved leave
            const leave = leaveMap.get(entry.entityId);
            const status = leave ? AttendanceStatus.LEAVE : entry.status;

            recordsToCreate.push({
                institutionId: this.institutionId,
                academicYearId: academicYearId,
                studentId: entry.entityId,
                classId: enrollment.class_id,
                sectionId: enrollment.section_id,
                date: new Date(dto.date),
                status: status,
                periodNumber: null,
                checkInTime: entry.checkInTime,
                checkOutTime: entry.checkOutTime,
                remark: leave ? `Approved Leave: ${leave.reason}` : entry.remark,
                countValue: STATUS_COUNT_VALUES[status],
                markedById: userId,
                markedAt: new Date(),
                lastModifiedById: userId,
                lastModifiedAt: new Date()
            });
        }

        if (recordsToCreate.length === 0) {
            return result;
        }

        // 4. Execute Bulk Create with transaction and duplicate handling
        const transaction = await StudentAttendance.sequelize?.transaction();
        try {
            await StudentAttendance.schema(this.schemaName).bulkCreate(recordsToCreate, {
                transaction,
                updateOnDuplicate: ['status', 'countValue', 'remark', 'checkInTime', 'checkOutTime', 'lastModifiedAt', 'lastModifiedById']
            });
            
            result.markedCount = recordsToCreate.length;

            // 5. Trigger summary recalculations
            // We mark the broader scopes for recalculation
            if (dto.sectionId) {
                await this.summaryRepo.markForRecalculation({
                    academicYearId,
                    scope: SummaryScope.SECTION,
                    entityId: dto.sectionId,
                    date: dto.date
                }, transaction);
            } else if (dto.classId) {
                await this.summaryRepo.markForRecalculation({
                    academicYearId,
                    scope: SummaryScope.CLASS,
                    entityId: dto.classId,
                    date: dto.date
                }, transaction);
            }

            // Also mark institution scope
            await this.summaryRepo.markForRecalculation({
                academicYearId,
                scope: SummaryScope.INSTITUTION,
                entityId: this.institutionId,
                date: dto.date
            }, transaction);

            // 6. Log Audit
            await this.auditRepo.log({
                entityType: AuditEntityType.STUDENT_ATTENDANCE,
                entityId: dto.sectionId || dto.classId || 'BULK',
                action: AuditAction.CREATE,
                newValues: {
                    date: dto.date,
                    markedCount: result.markedCount,
                    skippedCount: result.skippedCount
                },
                changedById: userId
            });

            await transaction?.commit();
            return result;
        } catch (error) {
            await transaction?.rollback();
            throw error;
        }
    }

    /**
     * Update existing attendance
     */
    async updateAttendance(
        id: string,
        dto: UpdateAttendanceDto,
        userId: string,
        permissions: string[]
    ): Promise<StudentAttendance> {
        // Get existing attendance
        const attendance = await this.attendanceRepo.findById(id);
        if (!attendance) {
            throw createAttendanceError('ATTENDANCE_NOT_FOUND');
        }

        // Check if can edit
        await this.canEdit(attendance, userId, permissions);

        // Store previous values for audit
        const previousValues = {
            status: attendance.status,
            remark: attendance.remark,
            checkInTime: attendance.checkInTime,
            checkOutTime: attendance.checkOutTime
        };

        // Update
        const updateData: Partial<StudentAttendance> = {
            lastModifiedById: userId,
            lastModifiedAt: new Date()
        };

        if (dto.status) {
            updateData.status = dto.status;
            updateData.countValue = STATUS_COUNT_VALUES[dto.status];
        }
        if (dto.remark !== undefined) updateData.remark = dto.remark;
        if (dto.checkInTime) updateData.checkInTime = dto.checkInTime;
        if (dto.checkOutTime) updateData.checkOutTime = dto.checkOutTime;

        await this.attendanceRepo.update(id, updateData);

        // Trigger summary recalculation for relevant scopes
        await this.summaryRepo.markForRecalculation({
            academicYearId: attendance.academicYearId,
            scope: SummaryScope.STUDENT,
            entityId: attendance.studentId,
            date: attendance.date
        });
        await this.summaryRepo.markForRecalculation({
            academicYearId: attendance.academicYearId,
            scope: SummaryScope.SECTION,
            entityId: attendance.sectionId,
            date: attendance.date
        });

        // Log audit
        await this.auditRepo.log({
            entityType: AuditEntityType.STUDENT_ATTENDANCE,
            entityId: id,
            action: AuditAction.UPDATE,
            previousValues,
            newValues: {
                status: dto.status,
                remark: dto.remark
            },
            changedById: userId,
            reason: dto.editReason
        });

        // Return updated record
        return (await this.attendanceRepo.findById(id))!;
    }

    /**
     * Delete attendance record (soft delete)
     */
    async deleteAttendance(
        id: string,
        userId: string,
        reason: string
    ): Promise<void> {
        const attendance = await this.attendanceRepo.findById(id);
        if (!attendance) {
            throw createAttendanceError('ATTENDANCE_NOT_FOUND');
        }

        // Store current values for audit before delete
        const previousValues = {
            status: attendance.status,
            date: attendance.date,
            studentId: attendance.studentId
        };

        await this.attendanceRepo.softDelete(id, userId);

        // Mark for recalculation
        await this.summaryRepo.markForRecalculation({
            academicYearId: attendance.academicYearId,
            scope: SummaryScope.STUDENT,
            entityId: attendance.studentId,
            date: attendance.date
        });
        await this.summaryRepo.markForRecalculation({
            academicYearId: attendance.academicYearId,
            scope: SummaryScope.SECTION,
            entityId: attendance.sectionId,
            date: attendance.date
        });

        // Log audit
        await this.auditRepo.log({
            entityType: AuditEntityType.STUDENT_ATTENDANCE,
            entityId: id,
            action: AuditAction.DELETE,
            previousValues,
            changedById: userId,
            reason
        });
    }

    /**
     * Get attendance list with filters
     */
    async getAttendance(
        query: AttendanceQueryDto
    ): Promise<PaginatedResponse<StudentAttendance>> {
        return this.attendanceRepo.list(query);
    }

    /**
     * Get daily attendance for marking
     */
    async getDailyAttendance(
        academicYearId: string,
        query: DailyAttendanceQueryDto
    ): Promise<Array<{
        studentId: string;
        studentName: string;
        rollNumber: string;
        status: AttendanceStatus;
        remark: string;
        isLocked: boolean;
        attendanceId?: string;
    }>> {
        // Get enrolled students
        // Build where clause dynamically to avoid undefined values
        const where: Record<string, unknown> = {
            institution_id: this.institutionId,
            academic_year_id: academicYearId,
            status: StudentEnrollmentStatus.ACTIVE
        };

        if (query.classId) where.class_id = query.classId;
        if (query.sectionId) where.section_id = query.sectionId;

        const attendanceWhere: Record<string, unknown> = {
            institutionId: this.institutionId,
            academicYearId,
            date: query.date,
            isDeleted: false,
            periodNumber: null,
        };

        if (query.classId) attendanceWhere.classId = query.classId;
        if (query.sectionId) attendanceWhere.sectionId = query.sectionId;

        const enrollments = await StudentEnrollment.schema(this.schemaName).findAll({
            where,
            include: [{
                model: Student.schema(this.schemaName),
                as: 'student',
                include: [{
                    model: User.schema(this.schemaName),
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name']
                }, {
                    model: StudentAttendance.schema(this.schemaName),
                    as: 'attendance_records',
                    required: false,
                    where: attendanceWhere,
                    attributes: ['id', 'studentId', 'status', 'remark', 'isLocked'],
                }],
            }],
            order: [['roll_number', 'ASC']]
        });

        // Build response
        return enrollments.map(enrollment => {
            const attendanceRecords = enrollment.student?.attendance_records || [];
            const att = attendanceRecords.length > 0 ? attendanceRecords[0] : undefined;
            return {
                studentId: enrollment.student_id,
                studentName: `${enrollment.student?.user?.first_name || ''} ${enrollment.student?.user?.last_name || ''}`.trim(),
                rollNumber: enrollment.roll_number || '',
                status: (att?.status || 'NOT_MARKED') as AttendanceStatus,
                remark: att?.remark || '',
                isLocked: att?.isLocked || false,
                attendanceId: att?.id
            };
        });
    }

    /**
     * Get attendance summary for a student
     */
    async getStudentSummary(
        studentId: string,
        academicYearId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IAttendanceSummary> {
        const summary = await this.attendanceRepo.getSummary(
            studentId,
            academicYearId,
            startDate,
            endDate
        );

        // Get student name
        const student = await Student.schema(this.schemaName).findOne({
            where: { id: studentId },
            include: [{
                model: User.schema(this.schemaName),
                as: 'user',
                attributes: ['first_name', 'last_name']
            }]
        });

        summary.entityName = student?.user 
            ? `${student.user.first_name} ${student.user.last_name}`
            : 'Unknown';

        return summary;
    }

    /**
     * Lock attendance for a section/date
     */
    async lockAttendance(
        date: Date | string,
        sectionId: string,
        userId: string
    ): Promise<{ lockedCount: number }> {
        const lockedCount = await this.attendanceRepo.lockAttendance(
            date,
            sectionId,
            userId
        );

        // Log audit
        await this.auditRepo.log({
            entityType: AuditEntityType.STUDENT_ATTENDANCE,
            entityId: sectionId,
            action: AuditAction.LOCK,
            newValues: {
                date,
                sectionId,
                lockedCount
            },
            changedById: userId
        });

        return { lockedCount };
    }

    /**
     * Get audit history for an attendance record
     */
    async getAuditHistory(attendanceId: string): Promise<AttendanceAuditLog[]> {
        return this.auditRepo.getHistory(
            AuditEntityType.STUDENT_ATTENDANCE,
            attendanceId
        );
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createStudentAttendanceService(
    schemaName: string,
    institutionId: string
): StudentAttendanceService {
    return new StudentAttendanceService(schemaName, institutionId);
}

