// ============================================================================
// TEACHER ATTENDANCE MODEL
// ============================================================================

import { 
    Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, 
    Index, BeforeCreate, BeforeUpdate, Scopes
} from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { Teacher } from '../academics/staff/Teacher.model';
import { AcademicSession } from '../academics/session/AcademicSession.model';
import { User } from '../../shared/core/User.model';

import { AttendanceStatus as TeacherAttendanceStatus, ATTENDANCE_COUNT_VALUES as TEACHER_STATUS_COUNT_VALUES } from '../../../../modules/school/attendance/types/attendance.types';

@Scopes(() => ({
    byInstitution: (institutionId: string) => ({
        where: { institutionId }
    }),
    byAcademicYear: (academicYearId: string) => ({
        where: { academicYearId }
    }),
    byTeacher: (teacherId: string) => ({
        where: { teacherId }
    }),
    // Optimized for daily staff dashboard
    forDailyView: (academicYearId: string, date: string) => ({
        where: { academicYearId, date }
    })
}))
@Table({ 
    tableName: 'teacher_attendance', 
    timestamps: true, 
    underscored: true,
    indexes: [
        // 1. UNIQUE: One record per teacher per day (ordered for partitioning)
        { 
            unique: true, 
            name: 'uq_teacher_attendance_record',
            fields: ['academic_year_id', 'teacher_id', 'date'] 
        },
        
        // 2. DAILY VIEW: School-wide staff attendance for a day
        { 
            name: 'idx_teacher_attendance_daily',
            fields: ['academic_year_id', 'date', 'status'] 
        },
        
        // 3. HISTORY: Individual teacher history
        { 
            name: 'idx_teacher_attendance_history',
            fields: ['academic_year_id', 'teacher_id', 'date'] 
        },
        
        // 4. PAYROLL SYNC: Get all attendance for a month for salary calculation
        { 
            name: 'idx_teacher_attendance_payroll',
            fields: ['academic_year_id', 'date', 'teacher_id'] 
        },

        // 5. TENANT ISOLATION
        { 
            name: 'teacher_attendance_tenant',
            fields: ['institution_id', 'academic_year_id'] 
        }
    ]
})
export class TeacherAttendance extends Model {
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

    // ==================== TEACHER REFERENCE ====================
    @ForeignKey(() => Teacher)
    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    teacherId!: string;

    @BelongsTo(() => Teacher)
    teacher!: Teacher;

    // ==================== ATTENDANCE DATA ====================
    @Index
    @Column({ type: DataType.DATEONLY, allowNull: false })
    date!: Date;

    @Index
    @Column({
        type: DataType.ENUM(...(Object.values(TeacherAttendanceStatus) as string[])),
        allowNull: false
    })
    status!: TeacherAttendanceStatus;

    @Column({ type: DataType.TIME, allowNull: true })
    checkInTime?: string;

    @Column({ type: DataType.TIME, allowNull: true })
    checkOutTime?: string;

    @Column({ 
        type: DataType.DECIMAL(3, 2), 
        allowNull: false,
        defaultValue: 1.0
    })
    countValue!: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    remark?: string;

    // ==================== AUDIT FIELDS ====================
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    markedById?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    markedAt?: Date;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    lastModifiedById?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    lastModifiedAt?: Date;

    // ==================== LOCK FIELDS ====================
    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    isLocked!: boolean;

    @Column({ type: DataType.DATE, allowNull: true })
    lockedAt?: Date;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    lockedById?: string;

    // ==================== SOFT DELETE ====================
    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    isDeleted!: boolean;

    // ==================== HOOKS ====================
    @BeforeCreate
    static setCountValue(instance: TeacherAttendance) {
        instance.countValue = TEACHER_STATUS_COUNT_VALUES[instance.status] ?? 1;
        instance.markedAt = new Date();
    }

    @BeforeUpdate
    static updateCountValue(instance: TeacherAttendance) {
        if (instance.changed('status')) {
            instance.countValue = TEACHER_STATUS_COUNT_VALUES[instance.status] ?? 1;
        }
        instance.lastModifiedAt = new Date();
    }
}

export default TeacherAttendance;
