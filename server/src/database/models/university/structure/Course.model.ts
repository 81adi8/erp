import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { Department } from './Department.model';

/**
 * Course - individual course (Data Structures, Algorithms, etc.)
 * University-specific model
 */
@Table({ tableName: 'courses', timestamps: true, underscored: true })
export class Course extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @ForeignKey(() => Department)
    @Column({ type: DataType.UUID, allowNull: false })
    department_id!: string;

    @BelongsTo(() => Department)
    department!: Department;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "Data Structures and Algorithms"

    @Column({ type: DataType.TEXT, unique: true })
    code?: string; // e.g., "CS201"

    @Column(DataType.TEXT)
    description?: string;

    @Column(DataType.INTEGER)
    credits?: number;

    @Column(DataType.INTEGER)
    lecture_hours?: number;

    @Column(DataType.INTEGER)
    lab_hours?: number;

    @Column(DataType.TEXT)
    course_type?: string; // CORE, ELECTIVE, LAB

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;
}

export default Course;
