import { Table, Column, Model, DataType, Default, ForeignKey, HasMany } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';

/**
 * Department - university department (CS, Engineering, etc.)
 * University-specific model
 */
@Table({ tableName: 'departments', timestamps: true, underscored: true })
export class Department extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "Computer Science", "Electrical Engineering"

    @Column(DataType.TEXT)
    code?: string; // e.g., "CSE", "EE"

    @Column(DataType.TEXT)
    description?: string;

    @Column(DataType.UUID)
    head_of_department_id?: string; // FK to Faculty

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;
}

export default Department;
