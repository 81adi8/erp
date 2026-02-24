import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../shared/core/User.model';
import { Institution } from '../../public/Institution.model';
import { Semester } from '../structure/Semester.model';

/**
 * GradeSheet - semester-wise grade summary
 * University-specific model
 */
@Table({ tableName: 'grade_sheets', timestamps: true, underscored: true })
export class GradeSheet extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    student_id!: string;

    @BelongsTo(() => User)
    student!: User;

    @ForeignKey(() => Semester)
    @Column({ type: DataType.UUID, allowNull: false })
    semester_id!: string;

    @BelongsTo(() => Semester)
    semester!: Semester;

    @Column(DataType.INTEGER)
    total_credits?: number;

    @Column(DataType.INTEGER)
    credits_earned?: number;

    @Column(DataType.DECIMAL(4, 2))
    sgpa?: number; // Semester GPA

    @Column(DataType.DECIMAL(4, 2))
    cgpa?: number; // Cumulative GPA

    @Default('draft')
    @Column(DataType.TEXT)
    status!: string; // draft, published, finalized
}

export default GradeSheet;
