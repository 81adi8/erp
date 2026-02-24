import { Table, Column, Model, DataType, Default, ForeignKey } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';

/**
 * Subject model - represents subjects taught (Math, Science, English)
 * School-specific model
 */
@Table({ tableName: 'subjects', timestamps: true, underscored: true })
export class Subject extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "Mathematics", "Science"

    @Column(DataType.TEXT)
    code?: string; // e.g., "MATH", "SCI"

    @Column(DataType.TEXT)
    description?: string;

    @Column(DataType.ENUM('CORE', 'ELECTIVE', 'LANGUAGE', 'VOCATIONAL', 'theory', 'practical', 'both'))
    subject_type?: string;

    @Column(DataType.INTEGER)
    max_marks?: number;

    @Column(DataType.INTEGER)
    passing_marks?: number;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_practical!: boolean;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Default(0)
    @Column(DataType.INTEGER)
    credit_hours!: number;

    @Column(DataType.TEXT)
    color_code?: string; // For UI calendars

    @Column(DataType.TEXT)
    icon_name?: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_compulsory!: boolean;

    @Default({})
    @Column(DataType.JSONB)
    assessment_weights!: any; // e.g., { theory: 70, practical: 30 }

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default Subject;
