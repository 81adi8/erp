import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { Department } from './Department.model';

/**
 * Program - academic program (B.Tech, M.Tech, PhD)
 * University-specific model
 */
@Table({ tableName: 'programs', timestamps: true, underscored: true })
export class Program extends Model {
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
    name!: string; // e.g., "Bachelor of Technology", "Master of Science"

    @Column(DataType.TEXT)
    code?: string; // e.g., "BTECH", "MSC"

    @Column(DataType.TEXT)
    degree_type?: string; // UNDERGRADUATE, POSTGRADUATE, DOCTORAL

    @Column(DataType.INTEGER)
    duration_years?: number; // 4, 2, 5

    @Column(DataType.INTEGER)
    total_credits?: number;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;
}

export default Program;
