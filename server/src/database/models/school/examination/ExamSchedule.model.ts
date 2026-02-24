import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Exam } from './Exam.model';
import { Class } from '../academics/class/Class.model';
import { Subject } from '../academics/curriculum/Subject.model';

/**
 * ExamSchedule - when each subject exam happens for each class
 * School-specific model
 */
@Table({ tableName: 'exam_schedules', timestamps: true, underscored: true })
export class ExamSchedule extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @ForeignKey(() => Exam)
    @Column({ type: DataType.UUID, allowNull: false })
    exam_id!: string;

    @BelongsTo(() => Exam)
    exam!: Exam;

    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: false })
    class_id!: string;

    @BelongsTo(() => Class)
    class!: Class;

    @ForeignKey(() => Subject)
    @Column({ type: DataType.UUID, allowNull: false })
    subject_id!: string;

    @BelongsTo(() => Subject)
    subject!: Subject;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    date!: string;

    @Column(DataType.TIME)
    start_time?: string;

    @Column(DataType.TIME)
    end_time?: string;

    @Column(DataType.DECIMAL(5, 2))
    max_marks?: number;

    @Column(DataType.DECIMAL(5, 2))
    passing_marks?: number;

    @Column(DataType.TEXT)
    room?: string;
}

export default ExamSchedule;
