import { Table, Column, Model, DataType, Default, ForeignKey } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';

/**
 * Semester - semester/term definition
 * University-specific model
 */
@Table({ tableName: 'semesters', timestamps: true, underscored: true })
export class Semester extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "Fall 2024", "Spring 2025"

    @Column(DataType.TEXT)
    code?: string; // e.g., "F24", "S25"

    @Column(DataType.DATEONLY)
    start_date?: string;

    @Column(DataType.DATEONLY)
    end_date?: string;

    @Column(DataType.TEXT)
    academic_year?: string; // e.g., "2024-25"

    @Default('upcoming')
    @Column(DataType.TEXT)
    status!: string; // upcoming, ongoing, completed

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;
}

export default Semester;
