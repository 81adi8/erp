import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { Section } from '../academics/class/Section.model';
import { Subject } from '../academics/curriculum/Subject.model';
import { Teacher } from '../academics/staff/Teacher.model';
import { Period } from './Period.model';

/**
 * Timetable entry - maps section + period + day to subject + teacher
 * School-specific model
 */
@Table({ tableName: 'timetables', timestamps: true, underscored: true })
export class Timetable extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @ForeignKey(() => Section)
    @Column({ type: DataType.UUID, allowNull: false })
    section_id!: string;

    @BelongsTo(() => Section)
    section!: Section;

    @ForeignKey(() => Period)
    @Column({ type: DataType.UUID, allowNull: false })
    period_id!: string;

    @BelongsTo(() => Period)
    period!: Period;

    @Column({ type: DataType.INTEGER, allowNull: false })
    day_of_week!: number; // 0=Sunday, 1=Monday, etc.

    @ForeignKey(() => Subject)
    @Column(DataType.UUID)
    subject_id?: string;

    @BelongsTo(() => Subject)
    subject?: Subject;

    @ForeignKey(() => Teacher)
    @Column(DataType.UUID)
    teacher_id?: string;

    @BelongsTo(() => Teacher)
    teacher?: Teacher;

    @Column(DataType.TEXT)
    room?: string; // Room/Lab number

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;
}

export default Timetable;
