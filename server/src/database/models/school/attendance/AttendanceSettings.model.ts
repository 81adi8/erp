// ============================================================================
// ATTENDANCE SETTINGS MODEL
// Configurable settings per scope (student/teacher/staff) with class overrides
// ============================================================================

import { 
    Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, Index
} from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { Class } from '../academics/class/Class.model';

import { AttendanceMode, AttendanceScope, NotificationChannel, AttendanceConfigRules as AttendanceRules } from '../../../../modules/school/attendance/types/attendance.types';

@Table({ 
    tableName: 'attendance_settings', 
    timestamps: true, 
    underscored: true,
    indexes: [
        // Unique constraint: one setting per scope per class (or global if class is null)
        { unique: true, fields: ['institution_id', 'scope', 'class_id'] },
        { fields: ['institution_id', 'scope'] },
        { fields: ['institution_id', 'is_active'] }
    ]
})
export class AttendanceSettings extends Model {
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

    // ==================== SCOPE ====================
    @Index
    @Column({
        type: DataType.ENUM(...(Object.values(AttendanceScope) as string[])),
        allowNull: false
    })
    scope!: AttendanceScope;

    // Class-specific override (null = global settings for scope)
    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: true })
    classId?: string;

    @BelongsTo(() => Class)
    class?: Class;

    // ==================== MODE SETTINGS ====================
    @Default(AttendanceMode.DAILY)
    @Column({
        type: DataType.ENUM(...(Object.values(AttendanceMode) as string[])),
        allowNull: false
    })
    mode!: AttendanceMode;

    @Default('09:00')
    @Column({ type: DataType.STRING(5), allowNull: false })
    defaultStartTime!: string;

    @Default('15:30')
    @Column({ type: DataType.STRING(5), allowNull: false })
    defaultEndTime!: string;

    // ==================== RULES (JSONB) ====================
    @Column({ 
        type: DataType.JSONB, 
        allowNull: false,
        defaultValue: {
            lateThresholdMinutes: 15,
            halfDayThresholdMinutes: 90,
            absentThresholdMinutes: 180,
            lockAfterHours: 24,
            editWindowHours: 2,
            requireApprovalForEdit: true,
            requireReasonForAbsent: true,
            autoMarkLeaveAsExcused: true,
            minimumAttendancePercent: 75
        }
    })
    rules!: AttendanceRules;

    // ==================== BACKDATED SETTINGS ====================
    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    allowBackdatedMarking!: boolean;

    @Default(3)
    @Column({ type: DataType.INTEGER, allowNull: false })
    backdatedDaysLimit!: number;

    // ==================== VISIBILITY SETTINGS ====================
    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    showToParents!: boolean;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    showToStudents!: boolean;

    // ==================== NOTIFICATION SETTINGS ====================
    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    autoNotifyParentOnAbsent!: boolean;

    @Column({ 
        type: DataType.ARRAY(DataType.STRING), 
        allowNull: false,
        defaultValue: [NotificationChannel.SMS, NotificationChannel.PUSH]
    })
    notificationChannels!: NotificationChannel[];

    // ==================== ACADEMIC SETTINGS ====================
    @Default(6)
    @Column({ type: DataType.INTEGER, allowNull: false })
    workingDaysInWeek!: number;

    @Default(8)
    @Column({ type: DataType.INTEGER, allowNull: false })
    periodsPerDay!: number;

    @Default(12)
    @Column({ type: DataType.INTEGER, allowNull: false })
    leaveQuotaPerYear!: number;

    // ==================== STATUS ====================
    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    isActive!: boolean;

    // ==================== METADATA ====================
    @Column({ type: DataType.JSONB, allowNull: true })
    metadata?: Record<string, unknown>;

    // ==================== HELPER METHODS ====================
    
    /**
     * Get effective settings (merge with global if this is class-specific)
     */
    static async getEffectiveSettings(
        schemaName: string,
        institutionId: string,
        scope: AttendanceScope,
        classId?: string
    ): Promise<AttendanceSettings | null> {
        // First try to get class-specific settings
        if (classId) {
            const classSettings = await AttendanceSettings.schema(schemaName).findOne({
                where: {
                    institutionId: institutionId,
                    scope,
                    classId: classId,
                    isActive: true
                }
            });
            if (classSettings) return classSettings;
        }

        // Fall back to global settings for scope
        return AttendanceSettings.schema(schemaName).findOne({
            where: {
                institutionId: institutionId,
                scope,
                classId: null,
                isActive: true
            }
        });
    }
}

export default AttendanceSettings;
