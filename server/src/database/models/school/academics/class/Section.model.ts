import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { Class } from './Class.model';
import { Teacher } from '../staff/Teacher.model';

/**
 * Section model - represents divisions within a class (A, B, C)
 * School-specific model
 */
@Table({ tableName: 'sections', timestamps: true, underscored: true })
export class Section extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: false })
    class_id!: string;

    @BelongsTo(() => Class)
    class!: Class;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "A", "B", "C"

    @Column(DataType.INTEGER)
    capacity?: number; // max students

    @Column(DataType.INTEGER)
    max_strength?: number;

    @ForeignKey(() => Teacher)
    @Column(DataType.UUID)
    class_teacher_id?: string;

    @BelongsTo(() => Teacher)
    class_teacher?: Teacher;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Column(DataType.TEXT)
    room_number?: string;

    @Column(DataType.TEXT)
    floor?: string;

    @Column(DataType.TEXT)
    wing?: string;

    @Default('PERIOD_WISE')
    @Column(DataType.ENUM('DAILY', 'PERIOD_WISE'))
    attendance_mode!: string;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default Section;
