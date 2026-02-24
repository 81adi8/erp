import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { AcademicYear } from '../session/AcademicYear.model';
import { Teacher } from '../staff/Teacher.model';
import { Class } from '../class/Class.model';
import { Section } from '../class/Section.model';

@Table({
    tableName: 'class_teacher_assignments',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'class_teacher_assignments_section_year_unique',
            unique: true,
            fields: ['institution_id', 'academic_year_id', 'section_id']
        }
    ]
})
export class ClassTeacherAssignment extends Model {
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

    @ForeignKey(() => Teacher)
    @Column({ type: DataType.UUID, allowNull: false })
    teacher_id!: string;

    @BelongsTo(() => Teacher)
    teacher!: Teacher;

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

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active!: boolean;
}

export default ClassTeacherAssignment;
