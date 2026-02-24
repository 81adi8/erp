import { Table, Column, Model, DataType, Default, ForeignKey, HasMany, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { Section } from './Section.model';
import { ClassSubject } from '../curriculum/ClassSubject.model';
import { AcademicYear } from '../session/AcademicYear.model';

/**
 * Class/Grade model - represents a grade level (1st Grade, 2nd Grade, etc.)
 * School-specific model
 */
@Table({ tableName: 'classes', timestamps: true, underscored: true })
export class Class extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => AcademicYear)
    @Column(DataType.UUID)
    academic_year_id?: string;

    @BelongsTo(() => AcademicYear, { foreignKey: 'academic_year_id', as: 'academic_year' })
    academic_year?: AcademicYear;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "Grade 1", "Class 10", "XII"

    @Column(DataType.TEXT)
    code?: string; // e.g., "G1", "C10"

    @Column(DataType.INTEGER)
    numeric_grade?: number; // 1, 2, 3... for ordering

    @Column({ type: DataType.ENUM('PRE_PRIMARY', 'PRIMARY', 'MIDDLE', 'SECONDARY', 'HIGHER_SECONDARY', 'DIPLOMA', 'GRADUATE', 'POST_GRADUATE') })
    category?: string;

    @Column(DataType.TEXT)
    language_of_instruction?: string;

    @Column(DataType.TEXT)
    description?: string;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Default(0)
    @Column(DataType.INTEGER)
    display_order!: number;

    // ========== PROMOTION MAPPING ==========
    // Next class in sequence for promotion (e.g., Class 1 -> Class 2)
    @Column(DataType.UUID)
    next_class_id?: string;

    // Is this the final class? (e.g., Class 12/10 for school)
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_terminal_class!: boolean;

    // Minimum passing percentage for promotion
    @Column(DataType.DECIMAL(5, 2))
    min_passing_percentage?: number;

    @HasMany(() => Section)
    sections!: Section[];

    @HasMany(() => ClassSubject)
    class_subjects!: ClassSubject[];
}

export default Class;
