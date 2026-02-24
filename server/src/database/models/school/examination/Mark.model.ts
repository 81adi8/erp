import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { ExamSchedule } from './ExamSchedule.model';
import { Student } from '../academics/student/Student.model';
import { Institution } from '../../public/Institution.model';
import { AcademicSession } from '../academics/session/AcademicSession.model';
import { Class } from '../academics/class/Class.model';
import { Section } from '../academics/class/Section.model';


/**
 * Mark - stores student marks for each exam
 * School-specific model
 */
@Table({
    tableName: 'marks',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['institution_id', 'exam_schedule_id', 'student_id'],
            name: 'marks_unique_per_student_exam_schedule',
        },
        {
            fields: ['student_id'],
            name: 'idx_marks_student_id',
        },
        {
            fields: ['exam_schedule_id'],
            name: 'idx_marks_exam_schedule_id',
        },
        {
            fields: ['institution_id'],
            name: 'idx_marks_institution_id',
        },
        {
            fields: ['student_id', 'institution_id'],
            name: 'idx_marks_student_exam',
        },
    ],
})
export class Mark extends Model {
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

    @ForeignKey(() => ExamSchedule)
    @Column({ type: DataType.UUID, allowNull: false })
    exam_schedule_id!: string;

    @BelongsTo(() => ExamSchedule)
    exam_schedule!: ExamSchedule;

    @ForeignKey(() => Student)
    @Column({ type: DataType.UUID, allowNull: false })
    student_id!: string;

    @BelongsTo(() => Student)
    student!: Student;

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

    @Column(DataType.DECIMAL(5, 2))
    // EXM-04 FIX: Added validator to ensure marks are non-negative
    // Note: For production, also add DB-level CHECK constraint:
    // ALTER TABLE marks ADD CHECK (marks_obtained >= 0);
    marks_obtained?: number;

    @Column(DataType.TEXT)
    grade?: string; // A+, A, B+, etc.

    @Column(DataType.TEXT)
    remarks?: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_absent!: boolean;
}

export default Mark;
