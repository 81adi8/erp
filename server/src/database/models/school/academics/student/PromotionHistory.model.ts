import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { AcademicSession } from '../session/AcademicSession.model';
import { Student } from './Student.model';
import { StudentEnrollment } from './StudentEnrollment.model';
import { Class } from '../class/Class.model';
import { Section } from '../class/Section.model';
import { User } from '../../../shared/core/User.model';

/**
 * PromotionHistory - tracks all promotion/detention decisions for audit trail
 * This model records every promotion decision made during session transitions
 */
export enum PromotionDecision {
    PROMOTED = 'PROMOTED',          // Moved to next class
    DETAINED = 'DETAINED',          // Failed, repeated same class
    COMPLETED = 'COMPLETED',        // Graduated from terminal class
    TRANSFERRED = 'TRANSFERRED',    // Transferred to another school
    DROPPED = 'DROPPED',            // Dropped out
    LATERAL_ENTRY = 'LATERAL_ENTRY' // Joined mid-session from another school
}

@Table({ tableName: 'promotion_history', timestamps: true, underscored: true })
export class PromotionHistory extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => Student)
    @Column({ type: DataType.UUID, allowNull: false })
    student_id!: string;

    @BelongsTo(() => Student)
    student!: Student;

    // ========== FROM (Previous Session) ==========
    @ForeignKey(() => AcademicSession)
    @Column({ type: DataType.UUID, allowNull: false })
    from_session_id!: string;

    @Column(DataType.UUID)
    from_academic_year_id?: string;

    @BelongsTo(() => AcademicSession, { foreignKey: 'from_session_id', as: 'fromSession' })
    from_session!: AcademicSession;

    @ForeignKey(() => StudentEnrollment)
    @Column({ type: DataType.UUID, allowNull: false })
    from_enrollment_id!: string;

    @BelongsTo(() => StudentEnrollment, { foreignKey: 'from_enrollment_id', as: 'fromEnrollment' })
    from_enrollment!: StudentEnrollment;

    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: false })
    from_class_id!: string;

    @BelongsTo(() => Class, { foreignKey: 'from_class_id', as: 'fromClass' })
    from_class!: Class;

    @ForeignKey(() => Section)
    @Column({ type: DataType.UUID, allowNull: false })
    from_section_id!: string;

    @BelongsTo(() => Section, { foreignKey: 'from_section_id', as: 'fromSection' })
    from_section!: Section;

    // ========== TO (New Session - May be null for transfers/dropouts) ==========
    @Column(DataType.UUID)
    to_session_id?: string;

    @Column(DataType.UUID)
    to_academic_year_id?: string;

    @Column(DataType.UUID)
    to_enrollment_id?: string;

    @Column(DataType.UUID)
    to_class_id?: string;

    @Column(DataType.UUID)
    to_section_id?: string;

    // ========== DECISION DETAILS ==========
    @Column({
        type: DataType.ENUM(...Object.values(PromotionDecision)),
        allowNull: false
    })
    decision!: PromotionDecision;

    @Column({
        type: DataType.ENUM(...Object.values(PromotionDecision)),
        allowNull: true
    })
    action?: PromotionDecision;

    @Column(DataType.DATEONLY)
    decision_date!: Date;

    @Column(DataType.DATEONLY)
    promoted_at?: Date;

    // Academic performance summary
    @Column(DataType.DECIMAL(5, 2))
    final_percentage?: number;

    @Column(DataType.TEXT)
    final_grade?: string;

    @Column(DataType.TEXT)
    result_status?: string; // 'PASS', 'FAIL', 'COMPARTMENT'

    @Column(DataType.TEXT)
    remarks?: string;

    // Compartment subjects (if applicable)
    @Default([])
    @Column(DataType.JSONB)
    compartment_subjects!: string[];

    // ========== AUDIT ==========
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    decided_by!: string;

    @ForeignKey(() => User)
    @Column(DataType.UUID)
    promoted_by?: string;

    @BelongsTo(() => User, { foreignKey: 'decided_by', as: 'decidedByUser' })
    decided_by_user!: User;

    @Column(DataType.TEXT)
    approved_by_name?: string; // For record keeping

    // Is this an automatic promotion or manual decision?
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_automatic!: boolean;

    // Was the decision later reversed?
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_reversed!: boolean;

    @Column(DataType.TEXT)
    reversal_reason?: string;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default PromotionHistory;
