// ============================================================================
// LEAVE APPLICATION MODEL
// ============================================================================

import { 
    Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, Index
} from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { AcademicSession } from '../academics/session/AcademicSession.model';
import { Class } from '../academics/class/Class.model';
import { Section } from '../academics/class/Section.model';
import { User } from '../../shared/core/User.model';

import { LeaveType, LeaveStatus, LeaveScope } from '../../../../modules/school/attendance/types/attendance.types';

@Table({ 
    tableName: 'leave_applications', 
    timestamps: true, 
    underscored: true,
    indexes: [
        { fields: ['institution_id', 'academic_year_id'] },
        { fields: ['institution_id', 'scope', 'entity_id'] },
        { fields: ['institution_id', 'status'] },
        { fields: ['entity_id', 'start_date', 'end_date'] },
        { fields: ['status'] }
    ]
})
export class LeaveApplication extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    // ==================== TENANT ISOLATION ====================
    @ForeignKey(() => Institution)
    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    institutionId!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    // ==================== ACADEMIC CONTEXT ====================
    @ForeignKey(() => AcademicSession)
    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    academicYearId!: string;

    @BelongsTo(() => AcademicSession)
    academic_session!: AcademicSession;

    // ==================== SCOPE & ENTITY ====================
    @Index
    @Column({
        type: DataType.ENUM(...(Object.values(LeaveScope) as string[])),
        allowNull: false
    })
    scope!: LeaveScope;

    // Entity ID (student_id, teacher_id, or staff_id based on scope)
    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    entityId!: string;

    // ==================== CLASS/SECTION (Only for students) ====================
    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: true })
    classId?: string;

    @BelongsTo(() => Class)
    class?: Class;

    @ForeignKey(() => Section)
    @Column({ type: DataType.UUID, allowNull: true })
    sectionId?: string;

    @BelongsTo(() => Section)
    section?: Section;

    // ==================== LEAVE DETAILS ====================
    @Column({
        type: DataType.ENUM(...(Object.values(LeaveType) as string[])),
        allowNull: false
    })
    leaveType!: LeaveType;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    startDate!: Date;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    endDate!: Date;

    @Column({ type: DataType.INTEGER, allowNull: false })
    totalDays!: number;

    @Column({ type: DataType.TEXT, allowNull: false })
    reason!: string;

    @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
    attachmentUrls?: string[];

    // ==================== STATUS ====================
    @Default(LeaveStatus.PENDING)
    @Index
    @Column({
        type: DataType.ENUM(...(Object.values(LeaveStatus) as string[])),
        allowNull: false
    })
    status!: LeaveStatus;

    // ==================== APPLICATION DETAILS ====================
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    appliedById!: string;

    @Default(DataType.NOW)
    @Column({ type: DataType.DATE, allowNull: false })
    appliedAt!: Date;

    // ==================== APPROVAL DETAILS ====================
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    approvedById?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    approvedAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    approvalNote?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    rejectionReason?: string;

    // Whether approved leave should mark attendance as excused
    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    markAsExcused!: boolean;

    // ==================== CANCELLATION ====================
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    cancelledById?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    cancelledAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    cancellationReason?: string;

    // ==================== SOFT DELETE ====================
    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    isDeleted!: boolean;

    // ==================== METADATA ====================
    @Column({ type: DataType.JSONB, allowNull: true })
    metadata?: Record<string, unknown>;
}

export default LeaveApplication;
