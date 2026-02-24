// ============================================================================
// ATTENDANCE REPOSITORY 
// Handles all database operations with tenant isolation
// ============================================================================

import { Op, Transaction, WhereOptions, Sequelize } from 'sequelize';
import { StudentAttendance } from '../../../../database/models/school/attendance/StudentAttendance.model';
import { TeacherAttendance } from '../../../../database/models/school/attendance/TeacherAttendance.model';
import { AttendanceSettings } from '../../../../database/models/school/attendance/AttendanceSettings.model';
import { LeaveApplication } from '../../../../database/models/school/attendance/LeaveApplication.model';
import { AttendanceSummary } from '../../../../database/models/school/attendance/AttendanceSummary.model';
import { AttendanceAuditLog } from '../../../../database/models/school/attendance/AttendanceAuditLog.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { Section } from '../../../../database/models/school/academics/class/Section.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { 
    AttendanceScope,
    PaginatedResponse,
    IAttendanceSummary,
    ClassAttendanceSummary,
    SummaryScope,
    SummaryPeriodType,
    AuditAction,
    AuditEntityType,
    AttendanceStatus,
    LeaveStatus
} from '../types/attendance.types';
import { AttendanceQueryDto, DailyAttendanceQueryDto } from '../dto/attendance.dto';
import { AttendanceError, AttendanceErrorCodes } from '../errors/attendance.error';
import { ATTENDANCE_LIMITS } from '../constants/attendance.constants';

// ============================================================================
// STUDENT ATTENDANCE REPOSITORY
// ============================================================================

export class StudentAttendanceRepository {
    private schemaName: string;
    private institutionId: string;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
    }

    private get model() {
        return StudentAttendance.schema(this.schemaName);
    }

    /**
     * Find attendance by ID with tenant isolation
     */
    async findById(id: string): Promise<StudentAttendance | null> {
        return this.model.findOne({
            where: {
                id,
                institutionId: this.institutionId,
                isDeleted: false
            }
        });
    }

    /**
     * Find attendance for a student on a specific date
     */
    async findByStudentAndDate(
        studentId: string, 
        date: Date | string,
        periodNumber?: number
    ): Promise<StudentAttendance | null> {
        const where: WhereOptions = {
            institutionId: this.institutionId,
            studentId: studentId,
            date,
            isDeleted: false
        };
        
        if (periodNumber) {
            (where as Record<string, unknown>).periodNumber = periodNumber;
        } else {
            (where as Record<string, unknown>).periodNumber = null;
        }

        return this.model.findOne({ where });
    }

    /**
     * Get attendance list with filters and pagination
     */
    async list(query: AttendanceQueryDto): Promise<PaginatedResponse<StudentAttendance>> {
        const { 
            page = 1, 
            limit = 50, 
            entityId, 
            classId, 
            sectionId, 
            startDate, 
            endDate, 
            status,
            isLocked,
            sortBy = 'date',
            sortOrder = 'DESC'
        } = query;
        const pageNumber = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(
            Math.max(1, Number(limit) || ATTENDANCE_LIMITS.DEFAULT_PAGE_SIZE),
            ATTENDANCE_LIMITS.MAX_PAGE_SIZE
        );

        const where: WhereOptions = {
            institutionId: this.institutionId,
            isDeleted: false
        };

        if (entityId) (where as Record<string, unknown>).studentId = entityId;
        if (classId) (where as Record<string, unknown>).classId = classId;
        if (sectionId) (where as Record<string, unknown>).sectionId = sectionId;
        if (status) (where as Record<string, unknown>).status = status;
        if (typeof isLocked === 'boolean') (where as Record<string, unknown>).isLocked = isLocked;

        if (startDate || endDate) {
            (where as Record<string, unknown>).date = {};
            if (startDate) ((where as Record<string, unknown>).date as Record<symbol, unknown>)[Op.gte] = startDate;
            if (endDate) ((where as Record<string, unknown>).date as Record<symbol, unknown>)[Op.lte] = endDate;
        }

        const { rows, count } = await this.model.findAndCountAll({
            where,
            include: [{
                model: Student.schema(this.schemaName),
                as: 'student',
                include: [{
                    model: User.schema(this.schemaName),
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }]
            }],
            order: [[sortBy, sortOrder]],
            limit: safeLimit,
            offset: (pageNumber - 1) * safeLimit
        });

        return {
            data: rows,
            total: count,
            page: pageNumber,
            limit: safeLimit,
            totalPages: Math.ceil(count / safeLimit)
        };
    }

    /**
     * Get daily attendance for a section
     */
    async getDailyAttendance(
        academicYearId: string,
        query: DailyAttendanceQueryDto
    ): Promise<StudentAttendance[]> {
        const where: WhereOptions = {
            institutionId: this.institutionId,
            academicYearId: academicYearId,
            date: query.date,
            isDeleted: false
        };

        if (query.classId) (where as Record<string, unknown>).classId = query.classId;
        if (query.sectionId) (where as Record<string, unknown>).sectionId = query.sectionId;

        return this.model.findAll({
            where,
            include: [{
                model: Student.schema(this.schemaName),
                as: 'student',
                include: [{
                    model: User.schema(this.schemaName),
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name']
                }]
            }],
            order: [['student', 'user', 'first_name', 'ASC']]
        });
    }

    /**
     * Create attendance record
     */
    async create(
        data: Partial<StudentAttendance>,
        transaction?: Transaction
    ): Promise<StudentAttendance> {
        return this.model.create(
            { ...data, institutionId: this.institutionId },
            { transaction }
        );
    }

    /**
     * Bulk create attendance records
     */
    async bulkCreate(
        records: Array<Partial<StudentAttendance>>,
        transaction?: Transaction
    ): Promise<StudentAttendance[]> {
        const dataWithInstitution = records.map(r => ({
            ...r,
            institutionId: this.institutionId
        }));

        return this.model.bulkCreate(dataWithInstitution, {
            transaction,
            updateOnDuplicate: ['status', 'remark', 'checkInTime', 'checkOutTime', 
                               'countValue', 'markedById', 'markedAt', 'lastModifiedById', 
                               'lastModifiedAt']
        });
    }

    /**
     * Update attendance record
     */
    async update(
        id: string,
        data: Partial<StudentAttendance>,
        transaction?: Transaction
    ): Promise<[number, StudentAttendance[]]> {
        return this.model.update(data, {
            where: {
                id,
                institutionId: this.institutionId,
                isDeleted: false
            },
            transaction,
            returning: true
        }) as unknown as [number, StudentAttendance[]];
    }

    /**
     * Soft delete attendance
     */
    async softDelete(
        id: string,
        deletedById: string,
        transaction?: Transaction
    ): Promise<number> {
        const [count] = await this.model.update(
            {
                isDeleted: true,
                deletedAt: new Date(),
                deletedById: deletedById
            },
            {
                where: {
                    id,
                    institutionId: this.institutionId
                },
                transaction
            }
        );
        return count;
    }

    /**
     * Lock attendance records for a date/section
     */
    async lockAttendance(
        date: Date | string,
        sectionId: string,
        lockedById: string,
        transaction?: Transaction
    ): Promise<number> {
        const [count] = await this.model.update(
            {
                isLocked: true,
                lockedAt: new Date(),
                lockedById: lockedById
            },
            {
                where: {
                    institutionId: this.institutionId,
                    sectionId: sectionId,
                    date,
                    isLocked: false,
                    isDeleted: false
                },
                transaction
            }
        );
        return count;
    }

    /**
     * Get attendance summary for a student
     */
    async getSummary(
        studentId: string,
        academicYearId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<IAttendanceSummary> {
        const where: WhereOptions = {
            institutionId: this.institutionId,
            studentId: studentId,
            academicYearId: academicYearId,
            isDeleted: false,
            status: { [Op.ne]: AttendanceStatus.HOLIDAY }
        };

        if (startDate || endDate) {
            (where as Record<string, unknown>).date = {};
            if (startDate) ((where as Record<string, unknown>).date as Record<symbol, unknown>)[Op.gte] = startDate;
            if (endDate) ((where as Record<string, unknown>).date as Record<symbol, unknown>)[Op.lte] = endDate;
        }

        const records = await this.model.findAll({
            where: where,
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                [Sequelize.fn('SUM', Sequelize.col('countValue')), 'value_sum']
            ],
            group: ['status'],
            raw: true
        }) as unknown as Array<{ status: AttendanceStatus; count: string; value_sum: string }>;

        let totalWorkingDays = 0;
        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let halfDays = 0;
        let leaveDays = 0;
        let excusedDays = 0;
        let totalValue = 0;

        for (const record of records) {
            const count = parseInt(record.count, 10);
            totalWorkingDays += count;
            totalValue += parseFloat(record.value_sum || '0');

            switch (record.status) {
                case AttendanceStatus.PRESENT:
                    presentDays = count;
                    break;
                case AttendanceStatus.ABSENT:
                    absentDays = count;
                    break;
                case AttendanceStatus.LATE:
                    lateDays = count;
                    break;
                case AttendanceStatus.HALF_DAY:
                    halfDays = count;
                    break;
                case AttendanceStatus.LEAVE:
                    leaveDays = count;
                    break;
                case AttendanceStatus.EXCUSED:
                    excusedDays = count;
                    break;
            }
        }

        const attendancePercentage = totalWorkingDays > 0 
            ? Math.round((totalValue / totalWorkingDays) * 100 * 100) / 100
            : 0;

        return {
            entityId: studentId,
            entityName: '', // Will be populated by service
            totalWorkingDays,
            presentDays,
            absentDays,
            lateDays,
            halfDays,
            leaveDays,
            excusedDays,
            attendancePercentage
        };
    }

    /**
     * Get class attendance summary for a date
     */
    async getClassSummary(
        classId: string,
        sectionId: string,
        date: Date | string,
        academicYearId: string
    ): Promise<ClassAttendanceSummary> {
        const where: WhereOptions = {
            institutionId: this.institutionId,
            academicYearId: academicYearId,
            date,
            isDeleted: false
        };

        if (classId) (where as Record<string, unknown>).classId = classId;
        if (sectionId) (where as Record<string, unknown>).sectionId = sectionId;

        const records = await this.model.findAll({
            where,
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        }) as unknown as Array<{ status: AttendanceStatus; count: string }>;

        // Get total students in section
        const totalStudents = await Student.schema(this.schemaName).count({
            where: {
                institution_id: this.institutionId,
                // Need enrollment check here
            }
        });

        let present = 0;
        let absent = 0;
        let late = 0;
        let leave = 0;
        let markedCount = 0;

        for (const record of records) {
            const count = parseInt(record.count, 10);
            markedCount += count;

            switch (record.status) {
                case AttendanceStatus.PRESENT:
                case AttendanceStatus.EXCUSED:
                    present += count;
                    break;
                case AttendanceStatus.ABSENT:
                    absent += count;
                    break;
                case AttendanceStatus.LATE:
                case AttendanceStatus.HALF_DAY:
                    late += count;
                    break;
                case AttendanceStatus.LEAVE:
                    leave += count;
                    break;
            }
        }

        const unmarked = totalStudents - markedCount;
        const attendancePercentage = markedCount > 0 
            ? Math.round((present / markedCount) * 100)
            : 0;

        return {
            classId,
            className: '', // Will be populated by service
            sectionId,
            sectionName: '', // Will be populated by service
            date: new Date(date),
            totalStudents,
            present,
            absent,
            late,
            leave,
            unmarked,
            attendancePercentage
        };
    }

    /**
     * Check for existing attendance (to prevent duplicates)
     */
    async exists(
        studentId: string,
        date: Date | string,
        periodNumber?: number
    ): Promise<boolean> {
        const count = await this.model.count({
            where: {
                institutionId: this.institutionId,
                studentId: studentId,
                date,
                periodNumber: periodNumber || null,
                isDeleted: false
            }
        });
        return count > 0;
    }
}

// ============================================================================
// SETTINGS REPOSITORY
// ============================================================================

export class AttendanceSettingsRepository {
    private schemaName: string;
    private institutionId: string;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
    }

    private get model() {
        return AttendanceSettings.schema(this.schemaName);
    }

    /**
     * Get settings for a scope (with class override support)
     */
    async getSettings(
        scope: AttendanceScope,
        classId?: string
    ): Promise<AttendanceSettings | null> {
        // First try class-specific settings
        if (classId) {
            const classSettings = await this.model.findOne({
                where: {
                    institutionId: this.institutionId,
                    scope,
                    classId: classId,
                    isActive: true
                }
            });
            if (classSettings) return classSettings;
        }

        // Fall back to global settings
        return this.model.findOne({
            where: {
                institutionId: this.institutionId,
                scope,
                classId: null,
                isActive: true
            }
        });
    }

    /**
     * Get all settings for institution
     */
    async getAll(scope?: AttendanceScope): Promise<AttendanceSettings[]> {
        const where: WhereOptions = {
            institutionId: this.institutionId
        };

        if (scope) (where as Record<string, unknown>).scope = scope;

        return this.model.findAll({
            where,
            include: [{
                model: Class.schema(this.schemaName),
                as: 'class',
                attributes: ['id', 'name']
            }],
            order: [['scope', 'ASC'], ['classId', 'ASC']]
        });
    }

    /**
     * Create or update settings
     */
    async upsert(
        data: Partial<AttendanceSettings>,
        transaction?: Transaction
    ): Promise<[AttendanceSettings, boolean]> {
        return this.model.upsert(
            { ...data, institutionId: this.institutionId },
            { transaction }
        ) as unknown as [AttendanceSettings, boolean];
    }
}

// ============================================================================
// LEAVE REPOSITORY
// ============================================================================

export class LeaveRepository {
    private schemaName: string;
    private institutionId: string;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
    }

    private get model() {
        return LeaveApplication.schema(this.schemaName);
    }

    async findById(id: string): Promise<LeaveApplication | null> {
        return this.model.findOne({
            where: {
                id,
                institutionId: this.institutionId,
                isDeleted: false
            }
        });
    }

    async findOverlappingLeave(
        entityId: string,
        startDate: Date | string,
        endDate: Date | string,
        excludeId?: string
    ): Promise<LeaveApplication | null> {
        const where: WhereOptions = {
            institutionId: this.institutionId,
            entityId: entityId,
            status: { [Op.in]: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
            isDeleted: false,
            [Op.or]: [
                { startDate: { [Op.between]: [startDate, endDate] } },
                { endDate: { [Op.between]: [startDate, endDate] } },
                {
                    [Op.and]: [
                        { startDate: { [Op.lte]: startDate } },
                        { endDate: { [Op.gte]: endDate } }
                    ]
                }
            ]
        };

        if (excludeId) {
            (where as Record<string, unknown>).id = { [Op.ne]: excludeId };
        }

        return this.model.findOne({ where });
    }

    async create(
        data: Partial<LeaveApplication>,
        transaction?: Transaction
    ): Promise<LeaveApplication> {
        return this.model.create(
            { ...data, institutionId: this.institutionId },
            { transaction }
        );
    }

    async update(
        id: string,
        data: Partial<LeaveApplication>,
        transaction?: Transaction
    ): Promise<[number]> {
        return this.model.update(data, {
            where: {
                id,
                institutionId: this.institutionId,
                isDeleted: false
            },
            transaction
        });
    }

    /**
     * Get approved leaves for a set of students on a specific date
     */
    async getApprovedLeavesForDate(
        entityIds: string[],
        date: string | Date
    ): Promise<LeaveApplication[]> {
        return this.model.findAll({
            where: {
                institutionId: this.institutionId,
                entityId: { [Op.in]: entityIds },
                status: LeaveStatus.APPROVED,
                isDeleted: false,
                startDate: { [Op.lte]: date },
                endDate: { [Op.gte]: date }
            }
        });
    }

    async list(query: {
        scope?: AttendanceScope;
        entityId?: string;
        classId?: string;
        status?: LeaveStatus;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<LeaveApplication>> {
        const { page = 1, limit = 50 } = query;
        const pageNumber = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(
            Math.max(1, Number(limit) || ATTENDANCE_LIMITS.DEFAULT_PAGE_SIZE),
            ATTENDANCE_LIMITS.MAX_PAGE_SIZE
        );
        
        const where: WhereOptions = {
            institutionId: this.institutionId,
            isDeleted: false
        };

        if (query.scope) (where as Record<string, unknown>).scope = query.scope;
        if (query.entityId) (where as Record<string, unknown>).entityId = query.entityId;
        if (query.classId) (where as Record<string, unknown>).classId = query.classId;
        if (query.status) (where as Record<string, unknown>).status = query.status;

        if (query.startDate || query.endDate) {
            (where as Record<string, unknown>).startDate = {};
            if (query.startDate) ((where as Record<string, unknown>).startDate as Record<symbol, unknown>)[Op.gte] = query.startDate;
            if (query.endDate) ((where as Record<string, unknown>).startDate as Record<symbol, unknown>)[Op.lte] = query.endDate;
        }

        const { rows, count } = await this.model.findAndCountAll({
            where,
            order: [['appliedAt', 'DESC']],
            limit: safeLimit,
            offset: (pageNumber - 1) * safeLimit
        });

        return {
            data: rows,
            total: count,
            page: pageNumber,
            limit: safeLimit,
            totalPages: Math.ceil(count / safeLimit)
        };
    }
}

// ============================================================================
// AUDIT LOG REPOSITORY  
// ============================================================================

export class AttendanceAuditRepository {
    private schemaName: string;
    private institutionId: string;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
    }

    private get model() {
        return AttendanceAuditLog.schema(this.schemaName);
    }

    async log(data: {
        entityType: AuditEntityType;
        entityId: string;
        action: AuditAction;
        previousValues?: Record<string, unknown>;
        newValues?: Record<string, unknown>;
        changedById: string;
        reason?: string;
        ipAddress?: string;
    }): Promise<AttendanceAuditLog> {
        return AttendanceAuditLog.logChange(this.schemaName, {
            institutionId: this.institutionId,
            ...data
        });
    }

    async getHistory(
        entityType: AuditEntityType,
        entityId: string,
        limit: number = 50
    ): Promise<AttendanceAuditLog[]> {
        return AttendanceAuditLog.getHistory(
            this.schemaName,
            this.institutionId,
            entityType,
            entityId,
            limit
        );
    }
}

// ============================================================================
// REPOSITORY FACTORY
// ============================================================================

export class AttendanceSummaryRepository {
    private schemaName: string;
    private institutionId: string;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
    }

    private model() {
        return AttendanceSummary.schema(this.schemaName);
    }

    async upsert(data: Partial<AttendanceSummary>, transaction?: Transaction) {
        const [instance] = await this.model().upsert({
            ...data,
            institutionId: this.institutionId
        }, { transaction });
        return instance;
    }

    async getSummary(query: {
        academicYearId: string;
        scope: SummaryScope;
        entityId: string;
        periodType: SummaryPeriodType;
        periodStart: string | Date;
    }) {
        return this.model().findOne({
            where: {
                institutionId: this.institutionId,
                academicYearId: query.academicYearId,
                scope: query.scope,
                entityId: query.entityId,
                periodType: query.periodType,
                periodStart: query.periodStart
            }
        });
    }

    async markForRecalculation(query: {
        academicYearId: string;
        scope: SummaryScope;
        entityId: string;
        date: string | Date;
    }, transaction?: Transaction) {
        return this.model().update(
            { needsRecalculation: true },
            {
                where: {
                    institutionId: this.institutionId,
                    academicYearId: query.academicYearId,
                    scope: query.scope,
                    entityId: query.entityId,
                    periodStart: { [Op.lte]: query.date },
                    periodEnd: { [Op.gte]: query.date }
                },
                transaction
            }
        );
    }

    /**
     * Find summaries based on criteria with optional date range
     */
    async list(query: {
        academicYearId: string;
        scope?: SummaryScope;
        entityId?: string;
        periodType?: SummaryPeriodType;
        periodStart?: string | Date;
        startDate?: string | Date;
        endDate?: string | Date;
        limit?: number;
    }) {
        const safeLimit = Math.min(
            Math.max(1, Number(query.limit) || ATTENDANCE_LIMITS.DEFAULT_PAGE_SIZE),
            ATTENDANCE_LIMITS.MAX_PAGE_SIZE
        );

        const where: WhereOptions = {
            institutionId: this.institutionId,
            academicYearId: query.academicYearId
        };

        if (query.scope) (where as Record<string, unknown>).scope = query.scope;
        if (query.entityId) (where as Record<string, unknown>).entityId = query.entityId;
        if (query.periodType) (where as Record<string, unknown>).periodType = query.periodType;
        
        if (query.periodStart) {
            (where as Record<string, unknown>).periodStart = query.periodStart;
        } else if (query.startDate || query.endDate) {
            (where as Record<string, unknown>).periodStart = {};
            if (query.startDate) ((where as Record<string, unknown>).periodStart as Record<symbol, unknown>)[Op.gte] = query.startDate;
            if (query.endDate) ((where as Record<string, unknown>).periodStart as Record<symbol, unknown>)[Op.lte] = query.endDate;
        }

        return this.model().findAll({
            where: where,
            order: [['periodStart', 'DESC']],
            limit: safeLimit
        });
    }
}

export const createAttendanceRepositories = (schemaName: string, institutionId: string) => {
    return {
        studentAttendance: new StudentAttendanceRepository(schemaName, institutionId),
        settings: new AttendanceSettingsRepository(schemaName, institutionId),
        leave: new LeaveRepository(schemaName, institutionId),
        audit: new AttendanceAuditRepository(schemaName, institutionId),
        summary: new AttendanceSummaryRepository(schemaName, institutionId)
    };
};
