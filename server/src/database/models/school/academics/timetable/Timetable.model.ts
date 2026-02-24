import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { AcademicYear } from '../session/AcademicYear.model';
import { Class } from '../class/Class.model';
import { Section } from '../class/Section.model';
import { Subject } from '../curriculum/Subject.model';
import { User } from '../../../shared/core/User.model';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

@Table({
    tableName: 'timetables',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'timetables_unique_class_slot',
            unique: true,
            fields: ['institution_id', 'academic_year_id', 'class_id', 'section_id', 'day_of_week', 'period_number']
        },
        {
            name: 'timetables_unique_teacher_slot',
            unique: true,
            fields: ['institution_id', 'academic_year_id', 'teacher_id', 'day_of_week', 'period_number']
        }
    ]
})
export class Timetable extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => AcademicYear)
    @Column({ type: DataType.UUID, allowNull: false })
    academic_year_id!: string;

    @BelongsTo(() => AcademicYear)
    academic_year!: AcademicYear;

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

    @ForeignKey(() => Subject)
    @Column({ type: DataType.UUID, allowNull: false })
    subject_id!: string;

    @BelongsTo(() => Subject)
    subject!: Subject;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    teacher_id!: string;

    @BelongsTo(() => User, { foreignKey: 'teacher_id', as: 'teacher' })
    teacher!: User;

    @Column({ type: DataType.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'), allowNull: false })
    day_of_week!: DayOfWeek;

    @Column({ type: DataType.INTEGER, allowNull: false })
    period_number!: number;

    @Column({ type: DataType.TIME, allowNull: false })
    start_time!: string;

    @Column({ type: DataType.TIME, allowNull: false })
    end_time!: string;

    @Column(DataType.TEXT)
    room_number?: string;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active!: boolean;
}

export default Timetable;
