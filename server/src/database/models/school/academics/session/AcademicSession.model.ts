import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { User } from '../../../shared/core/User.model';
import { AcademicTerm } from './AcademicTerm.model';
import { SessionHoliday } from './SessionHoliday.model';

export enum AcademicSessionStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    ARCHIVED = 'ARCHIVED'
}

@Table({ tableName: 'academic_sessions', timestamps: true, underscored: true })
export class AcademicSession extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Column({ type: DataType.TEXT, unique: true })
    code?: string; // e.g., "AS2526"

    @Column({ type: DataType.DATEONLY, allowNull: false })
    start_date!: Date;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    end_date!: Date;

    @Column(DataType.DATEONLY)
    admission_start_date?: Date;

    @Column(DataType.DATEONLY)
    admission_end_date?: Date;

    @Default(AcademicSessionStatus.DRAFT)
    @Column({
        type: DataType.ENUM(...Object.values(AcademicSessionStatus)),
        allowNull: false
    })
    status!: AcademicSessionStatus;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_current!: boolean;

    // Configuration & Policies
    @Default([0]) // Default Sunday off
    @Column({ type: DataType.JSONB })
    weekly_off_days!: number[];

    @Default(0)
    @Column(DataType.INTEGER)
    attendance_backdate_days!: number;

    @Default(7)
    @Column(DataType.INTEGER)
    marks_lock_days!: number;

    // Results & Promotion
    @Column(DataType.JSONB)
    promotion_rule?: any;

    @Column(DataType.JSONB)
    result_publish_rules?: any;

    @Column(DataType.TEXT)
    notes?: string;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    created_by?: string;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    updated_by?: string;

    @Default({})
    @Column(DataType.JSONB)
    settings_config!: any;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;

    // ========== SESSION LOCKING CONFIGURATION ==========
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_locked!: boolean; // Master lock - when true, no modifications allowed

    @Column(DataType.DATE)
    locked_at?: Date; // When the session was locked

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    locked_by?: string; // Who locked the session

    @BelongsTo(() => User, { foreignKey: 'locked_by', as: 'lockedByUser' })
    locked_by_user?: User;

    // Granular locking for specific activities
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_attendance_locked!: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_marks_locked!: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_fees_locked!: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_enrollment_locked!: boolean;

    // Session chain linking for progression
    @Column(DataType.UUID)
    previous_session_id?: string; // Link to the previous academic session

    @Column(DataType.UUID)
    next_session_id?: string; // Link to the next academic session (when created)

    // Auto-lock configuration (in days after end_date)
    @Default(30)
    @Column(DataType.INTEGER)
    auto_lock_days!: number; // Days after end_date to auto-lock

    @HasMany(() => AcademicTerm)
    terms!: AcademicTerm[];

    @HasMany(() => SessionHoliday)
    holidays!: SessionHoliday[];
}

export default AcademicSession;
