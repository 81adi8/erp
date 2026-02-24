import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { AcademicYear } from '../session/AcademicYear.model';
import { Teacher } from '../staff/Teacher.model';
import { Subject } from '../curriculum/Subject.model';
import { Section } from '../class/Section.model';

@Table({
    tableName: 'subject_teacher_assignments',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'subject_teacher_assignments_unique',
            unique: true,
            fields: ['institution_id', 'academic_year_id', 'subject_id', 'section_id']
        }
    ]
})
export class SubjectTeacherAssignment extends Model {
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

    @ForeignKey(() => Subject)
    @Column({ type: DataType.UUID, allowNull: false })
    subject_id!: string;

    @BelongsTo(() => Subject)
    subject!: Subject;

    @ForeignKey(() => Section)
    @Column({ type: DataType.UUID, allowNull: false })
    section_id!: string;

    @BelongsTo(() => Section)
    section!: Section;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active!: boolean;
}

export default SubjectTeacherAssignment;
