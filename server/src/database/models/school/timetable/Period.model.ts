import { Table, Column, Model, DataType, Default, ForeignKey } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';

/**
 * Period definition - defines what periods exist in the school day
 * School-specific model
 */
@Table({ tableName: 'periods', timestamps: true, underscored: true })
export class Period extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "Period 1", "Lunch Break"

    @Column({ type: DataType.TIME, allowNull: false })
    start_time!: string; // e.g., "08:00:00"

    @Column({ type: DataType.TIME, allowNull: false })
    end_time!: string; // e.g., "08:45:00"

    @Column(DataType.INTEGER)
    order!: number; // 1, 2, 3...

    @Column(DataType.TEXT)
    type?: string; // CLASS, BREAK, LUNCH, ASSEMBLY

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;
}

export default Period;
