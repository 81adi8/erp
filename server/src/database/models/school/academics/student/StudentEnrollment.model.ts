import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { Student } from './Student.model';
import { Class } from '../class/Class.model';
import { Section } from '../class/Section.model';
import { AcademicSession } from '../session/AcademicSession.model';

export enum StudentEnrollmentStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PROMOTED = 'promoted',
    DETAINED = 'detained',
    DROPPED = 'dropped',
    COMPLETED = 'completed',
    TRANSFERRED = 'transferred',
    SUSPENDED = 'suspended'
}

/**
 * StudentEnrollment model - tracks which student is in which class/section for a specific year
 */
@Table({ tableName: 'student_enrollments', timestamps: true, underscored: true })
export class StudentEnrollment extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @ForeignKey(() => Student)
    @Column({ type: DataType.UUID, allowNull: false })
    student_id!: string;

    @BelongsTo(() => Student)
    student!: Student;

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

    @ForeignKey(() => Section)
    @Column({ type: DataType.UUID, allowNull: false })
    section_id!: string;

    @BelongsTo(() => Section)
    section!: Section;

    @Column(DataType.TEXT)
    roll_number?: string;

    @Default(StudentEnrollmentStatus.ACTIVE)
    @Column({
        type: DataType.ENUM(...Object.values(StudentEnrollmentStatus)),
        allowNull: false
    })
    status!: StudentEnrollmentStatus;

    @Column(DataType.DATEONLY)
    enrollment_date?: Date;

    // Alias field added for newer API contracts
    @Column(DataType.DATEONLY)
    enrolled_at?: Date;

    @Column(DataType.DATEONLY)
    leaving_date?: Date; // When student left this enrollment

    @Column(DataType.TEXT)
    remarks?: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_repeater!: boolean;

    // ========== PROMOTION CHAIN TRACKING ==========
    // Reference to previous enrollment (for tracking student history)
    @Column(DataType.UUID)
    previous_enrollment_id?: string;

    // Reference to next enrollment (set when student is promoted/moved)
    @Column(DataType.UUID)
    promoted_to_enrollment_id?: string;

    // Track which class student came from (useful for detained students)
    @Column(DataType.UUID)
    promoted_from_class_id?: string;

    @Column(DataType.DATEONLY)
    promotion_date?: Date; // When the promotion decision was made

    // Result summary for promotion decision
    @Column(DataType.DECIMAL(5, 2))
    final_percentage?: number;

    @Column(DataType.TEXT)
    final_grade?: string;

    @Column(DataType.TEXT)
    final_result?: string; // 'PASS', 'FAIL', 'COMPARTMENT', etc.

    // ========== ADDITIONAL DETAILS ==========
    @Default({})
    @Column(DataType.JSONB)
    scholarship_details!: any;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_new_admission!: boolean; // True if first enrollment in this school

    @Column(DataType.TEXT)
    transfer_certificate_number?: string;

    @Column(DataType.TEXT)
    admission_type?: string; // 'REGULAR', 'LATERAL', 'RTE', etc.

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default StudentEnrollment;
