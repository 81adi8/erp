import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../shared/core/User.model';
import { Institution } from '../../public/Institution.model';
import { Program } from '../structure/Program.model';
import { Semester } from '../structure/Semester.model';
import { Course } from '../structure/Course.model';

/**
 * Enrollment - student course enrollment
 * University-specific model
 */
@Table({ tableName: 'enrollments', timestamps: true, underscored: true })
export class Enrollment extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    student_id!: string; // User with student role

    @BelongsTo(() => User)
    student!: User;

    @ForeignKey(() => Program)
    @Column({ type: DataType.UUID, allowNull: false })
    program_id!: string;

    @BelongsTo(() => Program)
    program!: Program;

    @ForeignKey(() => Semester)
    @Column({ type: DataType.UUID, allowNull: false })
    semester_id!: string;

    @BelongsTo(() => Semester)
    semester!: Semester;

    @ForeignKey(() => Course)
    @Column({ type: DataType.UUID, allowNull: false })
    course_id!: string;

    @BelongsTo(() => Course)
    course!: Course;

    @Default('enrolled')
    @Column(DataType.TEXT)
    status!: string; // enrolled, completed, dropped, failed

    @Column(DataType.DECIMAL(4, 2))
    grade_point?: number;

    @Column(DataType.TEXT)
    grade?: string; // A, B, C, D, F
}

export default Enrollment;
