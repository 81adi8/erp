import { Table, Column, Model, DataType, Default, ForeignKey } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';

/**
 * Grade - defines grading system (A+ = 90-100, A = 80-89, etc.)
 * School-specific model
 */
@Table({ tableName: 'grades', timestamps: true, underscored: true })
export class Grade extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "A+", "A", "B+"

    @Column(DataType.DECIMAL(5, 2))
    min_percentage!: number; // e.g., 90

    @Column(DataType.DECIMAL(5, 2))
    max_percentage!: number; // e.g., 100

    @Column(DataType.DECIMAL(3, 2))
    grade_point?: number; // e.g., 4.0

    @Column(DataType.TEXT)
    description?: string; // e.g., "Excellent"

    @Default(0)
    @Column(DataType.INTEGER)
    display_order!: number;
}

export default Grade;
