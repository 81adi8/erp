// ============================================================================
// LEAVE APPLICATION SERVICE
// Business logic for leave management
// ============================================================================

import { Transaction, Op } from 'sequelize';
import { 
    LeaveRepository,
    AttendanceSettingsRepository,
    AttendanceAuditRepository,
    StudentAttendanceRepository,
    createAttendanceRepositories
} from '../repositories/attendance.repository';
import { LeaveApplication } from '../../../../database/models/school/attendance/LeaveApplication.model';
import { StudentAttendance } from '../../../../database/models/school/attendance/StudentAttendance.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { StudentEnrollment, StudentEnrollmentStatus } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { 
    AttendanceScope,
    PaginatedResponse,
    AuditAction,
    AuditEntityType,
    AttendanceStatus,
    LeaveStatus,
    LeaveType,
    LeaveScope
} from '../types/attendance.types';
import { 
    ApplyLeaveDto, 
    ApproveLeaveDto, 
    RejectLeaveDto,
    LeaveQueryDto
} from '../dto/attendance.dto';
import { AttendanceError, AttendanceErrorCodes, createAttendanceError } from '../errors/attendance.error';
import { ATTENDANCE_LIMITS } from '../constants/attendance.constants';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface LeaveResponse {
    id: string;
    scope: LeaveScope;
    entityId: string;
    entityName: string;
    classId?: string;
    className?: string;
    sectionId?: string;
    sectionName?: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    totalDays: number;
    reason: string;
    status: LeaveStatus;
    appliedById: string;
    appliedAt: Date;
    approvedById?: string;
    approvedAt?: Date;
    approvalNote?: string;
    rejectionReason?: string;
    attachments: string[];
}

interface LeaveBalanceResponse {
    entityId: string;
    academicYearId: string;
    totalLeaves: number;
    usedLeaves: number;
    pendingLeaves: number;
    remainingLeaves: number;
    byType: Record<LeaveType, { used: number; pending: number }>;
}

// ============================================================================
// LEAVE SERVICE
// ============================================================================

export class LeaveService {
    private schemaName: string;
    private institutionId: string;
    private leaveRepo: LeaveRepository;
    private settingsRepo: AttendanceSettingsRepository;
    private attendanceRepo: StudentAttendanceRepository;
    private auditRepo: AttendanceAuditRepository;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
        
        const repos = createAttendanceRepositories(schemaName, institutionId);
        this.leaveRepo = repos.leave;
        this.settingsRepo = repos.settings;
        this.attendanceRepo = repos.studentAttendance;
        this.auditRepo = repos.audit;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private calculateDays(startDate: Date | string, endDate: Date | string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    private mapToResponse(leave: LeaveApplication, entityName?: string): LeaveResponse {
        return {
            id: leave.id,
            scope: leave.scope,
            entityId: leave.entityId,
            entityName: entityName || '',
            classId: leave.classId,
            className: leave.class?.name,
            sectionId: leave.sectionId,
            sectionName: leave.section?.name,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            totalDays: leave.totalDays,
            reason: leave.reason,
            status: leave.status,
            appliedById: leave.appliedById,
            appliedAt: leave.appliedAt,
            approvedById: leave.approvedById,
            approvedAt: leave.approvedAt,
            approvalNote: leave.approvalNote,
            rejectionReason: leave.rejectionReason,
            attachments: leave.attachmentUrls || []
        };
    }

    private async getEntityName(scope: LeaveScope, entityId: string): Promise<string> {
        if (scope === LeaveScope.STUDENT) {
            const student = await Student.schema(this.schemaName).findOne({
                where: { id: entityId },
                include: [{
                    model: User.schema(this.schemaName),
                    as: 'user',
                    attributes: ['first_name', 'last_name']
                }]
            });
            return student?.user 
                ? `${student.user.first_name} ${student.user.last_name}`
                : 'Unknown';
        }
        return 'Unknown';
    }

    // =========================================================================
    // CORE OPERATIONS
    // =========================================================================

    /**
     * Apply for leave
     */
    async applyLeave(
        academicYearId: string,
        dto: ApplyLeaveDto,
        userId: string
    ): Promise<LeaveResponse> {
        // Validate dates
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (startDate > endDate) {
            throw createAttendanceError('LEAVE_INVALID_DATES', 'Start date must be before end date');
        }

        // Calculate total days
        const totalDays = this.calculateDays(startDate, endDate);

        // Check duration limit
        if (totalDays > ATTENDANCE_LIMITS.MAX_LEAVE_DURATION_DAYS) {
            throw createAttendanceError(
                'LEAVE_DURATION_EXCEEDED',
                `Leave duration cannot exceed ${ATTENDANCE_LIMITS.MAX_LEAVE_DURATION_DAYS} days`
            );
        }

        // Check for overlapping leaves
        const overlap = await this.leaveRepo.findOverlappingLeave(
            dto.entityId,
            dto.startDate,
            dto.endDate
        );

        if (overlap) {
            throw createAttendanceError('LEAVE_OVERLAP', 'Leave dates overlap with existing application');
        }

        // Get class/section for students
        let classId: string | undefined;
        let sectionId: string | undefined;

        if (dto.scope === AttendanceScope.STUDENT) {
            const enrollment = await StudentEnrollment.schema(this.schemaName).findOne({
                where: {
                    institution_id: this.institutionId,
                    student_id: dto.entityId,
                    academic_year_id: academicYearId,
                    status: StudentEnrollmentStatus.ACTIVE
                }
            });

            if (!enrollment) {
                throw createAttendanceError('STUDENT_NOT_FOUND', 'Student not enrolled in current academic year');
            }

            classId = enrollment.class_id;
            sectionId = enrollment.section_id;
        }

        // Create leave application
        const leave = await this.leaveRepo.create({
            academicYearId: academicYearId,
            scope: dto.scope as unknown as LeaveScope,
            entityId: dto.entityId,
            classId: classId,
            sectionId: sectionId,
            leaveType: dto.leaveType,
            startDate: startDate,
            endDate: endDate,
            totalDays: totalDays,
            reason: dto.reason,
            attachmentUrls: dto.attachmentUrls,
            status: LeaveStatus.PENDING,
            appliedById: userId,
            appliedAt: new Date()
        });

        // Log audit
        await this.auditRepo.log({
            entityType: AuditEntityType.LEAVE_APPLICATION,
            entityId: leave.id,
            action: AuditAction.CREATE,
            newValues: {
                entityId: dto.entityId,
                startDate: dto.startDate,
                endDate: dto.endDate,
                leaveType: dto.leaveType
            },
            changedById: userId
        });

        const entityName = await this.getEntityName(leave.scope, leave.entityId);
        return this.mapToResponse(leave, entityName);
    }

    /**
     * Approve leave
     */
    async approveLeave(
        id: string,
        dto: ApproveLeaveDto,
        userId: string
    ): Promise<LeaveResponse> {
        const leave = await this.leaveRepo.findById(id);

        if (!leave) {
            throw createAttendanceError('LEAVE_NOT_FOUND');
        }

        if (leave.status === LeaveStatus.APPROVED) {
            throw createAttendanceError('LEAVE_ALREADY_APPROVED');
        }

        if (leave.status === LeaveStatus.CANCELLED) {
            throw createAttendanceError('LEAVE_CANCELLED');
        }

        const transaction = await LeaveApplication.sequelize?.transaction();

        try {
            // Update leave status
            await this.leaveRepo.update(id, {
                status: LeaveStatus.APPROVED,
                approvedById: userId,
                approvedAt: new Date(),
                approvalNote: dto.approvalNote,
                markAsExcused: dto.markAsExcused ?? true
            }, transaction);

            // If mark as excused, update attendance records for leave dates
            if (dto.markAsExcused !== false && leave.scope === LeaveScope.STUDENT) {
                await this.markLeaveAsExcused(leave, transaction);
            }

            await transaction?.commit();

            // Log audit
            await this.auditRepo.log({
                entityType: AuditEntityType.LEAVE_APPLICATION,
                entityId: id,
                action: AuditAction.UPDATE,
                previousValues: { status: LeaveStatus.PENDING },
                newValues: { status: LeaveStatus.APPROVED },
                changedById: userId
            });

            const updatedLeave = await this.leaveRepo.findById(id);
            const entityName = await this.getEntityName(leave.scope, leave.entityId);
            return this.mapToResponse(updatedLeave!, entityName);
        } catch (error) {
            await transaction?.rollback();
            throw error;
        }
    }

    /**
     * Reject leave
     */
    async rejectLeave(
        id: string,
        dto: RejectLeaveDto,
        userId: string
    ): Promise<LeaveResponse> {
        const leave = await this.leaveRepo.findById(id);

        if (!leave) {
            throw createAttendanceError('LEAVE_NOT_FOUND');
        }

        if (leave.status === LeaveStatus.REJECTED) {
            throw createAttendanceError('LEAVE_ALREADY_REJECTED');
        }

        if (leave.status === LeaveStatus.CANCELLED) {
            throw createAttendanceError('LEAVE_CANCELLED');
        }

        await this.leaveRepo.update(id, {
            status: LeaveStatus.REJECTED,
            approvedById: userId,
            approvedAt: new Date(),
            rejectionReason: dto.rejectionReason
        });

        // Log audit
        await this.auditRepo.log({
            entityType: AuditEntityType.LEAVE_APPLICATION,
            entityId: id,
            action: AuditAction.UPDATE,
            previousValues: { status: leave.status },
            newValues: { status: LeaveStatus.REJECTED, rejectionReason: dto.rejectionReason },
            changedById: userId
        });

        const updatedLeave = await this.leaveRepo.findById(id);
        const entityName = await this.getEntityName(leave.scope, leave.entityId);
        return this.mapToResponse(updatedLeave!, entityName);
    }

    /**
     * Cancel leave
     */
    async cancelLeave(
        id: string,
        reason: string,
        userId: string
    ): Promise<LeaveResponse> {
        const leave = await this.leaveRepo.findById(id);

        if (!leave) {
            throw createAttendanceError('LEAVE_NOT_FOUND');
        }

        if (leave.status === LeaveStatus.CANCELLED) {
            throw createAttendanceError('LEAVE_CANCELLED');
        }

        // Only pending leaves can be cancelled by applicant
        // Approved leaves need admin permission
        if (leave.status !== LeaveStatus.PENDING && leave.appliedById === userId) {
            throw createAttendanceError('PERMISSION_DENIED', 'Only pending leaves can be cancelled');
        }

        const transaction = await LeaveApplication.sequelize?.transaction();

        try {
            await this.leaveRepo.update(id, {
                status: LeaveStatus.CANCELLED,
                cancelledById: userId,
                cancelledAt: new Date(),
                cancellationReason: reason
            }, transaction);

            // If was approved (excused), revert attendance to absent
            if (leave.status === LeaveStatus.APPROVED && leave.scope === LeaveScope.STUDENT) {
                await this.revertExcusedAttendance(leave, transaction);
            }

            await transaction?.commit();

            // Log audit
            await this.auditRepo.log({
                entityType: AuditEntityType.LEAVE_APPLICATION,
                entityId: id,
                action: AuditAction.UPDATE,
                previousValues: { status: leave.status },
                newValues: { status: LeaveStatus.CANCELLED, cancellationReason: reason },
                changedById: userId
            });

            const updatedLeave = await this.leaveRepo.findById(id);
            const entityName = await this.getEntityName(leave.scope, leave.entityId);
            return this.mapToResponse(updatedLeave!, entityName);
        } catch (error) {
            await transaction?.rollback();
            throw error;
        }
    }

    /**
     * Get leave applications with filters
     */
    async getLeaves(
        query: LeaveQueryDto
    ): Promise<PaginatedResponse<LeaveResponse>> {
        const result = await this.leaveRepo.list(query);

        const data = await Promise.all(
            result.data.map(async (leave: LeaveApplication) => {
                const entityName = await this.getEntityName(leave.scope, leave.entityId);
                return this.mapToResponse(leave, entityName);
            })
        );

        return {
            ...result,
            data
        };
    }

    /**
     * Get leave by ID
     */
    async getLeaveById(id: string): Promise<LeaveResponse> {
        const leave = await this.leaveRepo.findById(id);

        if (!leave) {
            throw createAttendanceError('LEAVE_NOT_FOUND');
        }

        const entityName = await this.getEntityName(leave.scope, leave.entityId);
        return this.mapToResponse(leave, entityName);
    }

    /**
     * Get leave balance for an entity
     */
    async getLeaveBalance(
        scope: AttendanceScope,
        entityId: string,
        academicYearId: string
    ): Promise<LeaveBalanceResponse> {
        // Get all leaves for the year
        const result = await this.leaveRepo.list({
            scope,
            entityId,
            page: 1,
            limit: 1000 // Get all
        });

        const leaves = result.data.filter((l: LeaveApplication) => 
            l.status !== LeaveStatus.CANCELLED && 
            l.status !== LeaveStatus.REJECTED
        );

        let usedLeaves = 0;
        let pendingLeaves = 0;
        const byType: Record<LeaveType, { used: number; pending: number }> = {
            [LeaveType.SICK]: { used: 0, pending: 0 },
            [LeaveType.CASUAL]: { used: 0, pending: 0 },
            [LeaveType.EMERGENCY]: { used: 0, pending: 0 },
            [LeaveType.PLANNED]: { used: 0, pending: 0 },
            [LeaveType.OTHER]: { used: 0, pending: 0 }
        };

        for (const leave of leaves) {
            if (leave.status === LeaveStatus.APPROVED) {
                usedLeaves += leave.totalDays;
                byType[leave.leaveType as LeaveType].used += leave.totalDays;
            } else if (leave.status === LeaveStatus.PENDING) {
                pendingLeaves += leave.totalDays;
                byType[leave.leaveType as LeaveType].pending += leave.totalDays;
            }
        }

        const settings = await this.settingsRepo.getSettings(scope);
        const totalLeaves = settings?.leaveQuotaPerYear ?? 12;

        return {
            entityId,
            academicYearId,
            totalLeaves,
            usedLeaves,
            pendingLeaves,
            remainingLeaves: totalLeaves - usedLeaves - pendingLeaves,
            byType
        };
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Mark attendance as excused for approved leave dates
     */
    private async markLeaveAsExcused(
        leave: LeaveApplication,
        transaction?: Transaction
    ): Promise<void> {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);

        // Update existing attendance records to EXCUSED
        // Or create new EXCUSED records
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const attendance = await this.attendanceRepo.findByStudentAndDate(
                leave.entityId,
                currentDate
            );

            if (attendance) {
                // Update to excused
                await this.attendanceRepo.update(attendance.id, {
                    status: AttendanceStatus.EXCUSED,
                    remark: `Leave approved: ${leave.leaveType}`
                }, transaction);
            }
            // If no attendance marked, we don't create one - let normal marking happen

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    /**
     * Revert excused attendance when leave is cancelled
     */
    private async revertExcusedAttendance(
        leave: LeaveApplication,
        transaction?: Transaction
    ): Promise<void> {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const attendance = await this.attendanceRepo.findByStudentAndDate(
                leave.entityId,
                currentDate
            );

            if (attendance && attendance.status === AttendanceStatus.EXCUSED) {
                // Revert to absent
                await this.attendanceRepo.update(attendance.id, {
                    status: AttendanceStatus.ABSENT,
                    remark: `Leave cancelled: ${leave.cancellationReason || 'No reason provided'}`
                }, transaction);
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createLeaveService(
    schemaName: string,
    institutionId: string
): LeaveService {
    return new LeaveService(schemaName, institutionId);
}

