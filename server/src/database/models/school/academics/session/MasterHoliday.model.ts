import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';

@Table({ tableName: 'master_holidays', timestamps: true, underscored: true })
export class MasterHoliday extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    month!: number; // 1-12

    @Column({ type: DataType.INTEGER, allowNull: false })
    day!: number; // 1-31

    @Column(DataType.TEXT)
    description?: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_gazetted!: boolean;

    @Default('NATIONAL')
    @Column(DataType.ENUM('NATIONAL', 'REGIONAL', 'SCHOOL', 'OTHER', 'SYSTEM'))
    holiday_type!: string;

    @Default('FIXED')
    @Column(DataType.ENUM('FIXED', 'RELATIVE', 'FORMULA'))
    calculation_type!: string;

    @Column(DataType.TEXT)
    holiday_key?: string; // e.g., 'IN_DIWALI', 'US_THANKSGIVING'

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_system_generated!: boolean;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default MasterHoliday;
