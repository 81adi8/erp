import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Class } from '../class/Class.model';
import { Subject } from './Subject.model';
import { Teacher } from '../staff/Teacher.model';
import { AcademicSession } from '../session/AcademicSession.model';
import { Section } from '../class/Section.model';
import { Institution } from '../../../public/Institution.model';

/**
 * Scheduling Preferences Interface
 * Used for intelligent timetable generation
 */
export interface SchedulingPreferences {
    /**
     * Preferred days of the week (0=Sunday, 1=Monday, ..., 6=Saturday)
     * If set, the generator will TRY to place this subject on these days first
     * Example: [4, 5] means prefer Friday and Saturday
     */
    preferred_days?: number[];

    /**
     * Days to AVOID for this subject (0=Sunday, 1=Monday, ..., 6=Saturday)
     * Generator will NOT place this subject on these days unless no other option
     * Example: [0, 1] means avoid Sunday and Monday
     */
    avoid_days?: number[];

    /**
     * Preferred slot positions: 'first', 'last', 'morning', 'afternoon', or specific numbers
     * 'first' = slots 1-2, 'last' = last 2 slots of day, 'morning' = before lunch, 'afternoon' = after lunch
     * Example: ['last'] or [7, 8] for last 2 periods
     */
    preferred_slots?: (string | number)[];

    /**
     * Slots to AVOID for this subject
     * Example: [1] means avoid first period
     */
    avoid_slots?: number[];

    /**
     * Whether this subject should be scheduled as consecutive periods (double period)
     * If true, generator will try to place 2 periods back-to-back
     */
    prefer_consecutive?: boolean;

    /**
     * Minimum gap (in periods) between two instances of this subject on the same day
     * Example: 2 means at least 2 periods gap if scheduled twice on same day
     */
    min_gap_same_day?: number;

    /**
     * Priority level for scheduling (1-10, higher = more important to satisfy preferences)
     * High priority subjects get their preferences first
     */
    priority?: number;

    /**
     * Require a specific room type (e.g., 'lab', 'computer_lab', 'sports_ground')
     * Generator will check room availability if room management is enabled
     */
    required_room_type?: string;

    /**
     * Fixed slots - if set, this subject MUST be placed at these exact positions
     * Format: [{ day: 1, slot: 3 }, { day: 3, slot: 5 }]
     */
    fixed_slots?: Array<{ day: number; slot: number }>;

    /**
     * Whether to spread this subject evenly across the week
     * If true, avoids placing multiple periods on the same day when possible
     */
    spread_evenly?: boolean;
}

/**
 * ClassSubject junction - which subjects are taught in which class
 * School-specific model - NOW SESSION AWARE for proper year isolation
 * Enhanced with rich scheduling preferences for intelligent timetable generation
 */
@Table({ tableName: 'class_subjects', timestamps: true, underscored: true })
export class ClassSubject extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => AcademicSession)
    @Column({ type: DataType.UUID, allowNull: false })
    academic_year_id!: string;

    @BelongsTo(() => AcademicSession)
    academic_session!: AcademicSession;

    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: false })
    class_id!: string;

    @BelongsTo(() => Class)
    class!: Class;

    // Optional section - allows different teacher assignments per section
    @ForeignKey(() => Section)
    @Column(DataType.UUID)
    section_id?: string;

    @BelongsTo(() => Section)
    section?: Section;

    @ForeignKey(() => Subject)
    @Column({ type: DataType.UUID, allowNull: false })
    subject_id!: string;

    @BelongsTo(() => Subject)
    subject!: Subject;

    @ForeignKey(() => Teacher)
    @Column(DataType.UUID)
    teacher_id?: string; // Primary teacher for this subject in this class

    @BelongsTo(() => Teacher)
    teacher?: Teacher;

    @Default(0)
    @Column(DataType.INTEGER)
    periods_per_week!: number;

    /**
     * Maximum periods allowed per day for this subject
     * Overrides template-level setting if specified
     */
    @Column(DataType.INTEGER)
    max_periods_per_day?: number;

    /**
     * Minimum periods required per week (for validation)
     * Useful for core subjects that must have minimum coverage
     */
    @Column(DataType.INTEGER)
    min_periods_per_week?: number;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_elective!: boolean;

    /**
     * Subject requires special resources (lab, computer, sports ground)
     * Used for room/resource allocation during timetable generation
     */
    @Default(false)
    @Column(DataType.BOOLEAN)
    requires_special_room!: boolean;

    /**
     * Type of special room required
     * Examples: 'science_lab', 'computer_lab', 'music_room', 'sports_ground'
     */
    @Column(DataType.STRING(50))
    special_room_type?: string;

    @Column(DataType.INTEGER)
    max_marks?: number;

    @Column(DataType.INTEGER)
    passing_marks?: number;

    /**
     * Rich scheduling preferences for intelligent timetable generation
     * See SchedulingPreferences interface for all options
     */
    @Default({})
    @Column(DataType.JSONB)
    scheduling_preferences!: SchedulingPreferences;

    /**
     * General metadata for extensibility
     */
    @Default({})
    @Column(DataType.JSONB)
    metadata!: Record<string, unknown>;
}

export default ClassSubject;
