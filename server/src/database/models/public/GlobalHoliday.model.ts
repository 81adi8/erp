import { Table, Column, Model, DataType, Default, Index } from 'sequelize-typescript';

@Table({ tableName: 'global_holidays', schema: 'public', timestamps: true, underscored: true })
export class GlobalHoliday extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    country_code!: string; // ISO 3166-1 alpha-2, e.g., 'IN'

    @Column({ type: DataType.TEXT })
    region?: string; // e.g., State code for India

    @Column({ type: DataType.INTEGER, allowNull: false })
    year!: number;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    date!: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    month!: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    day!: number;

    @Column({ type: DataType.TEXT })
    description?: string;

    @Default('NATIONAL')
    @Column({ type: DataType.TEXT })
    type!: string; // NATIONAL, REGIONAL, RELIGIOUS, etc.

    @Index
    @Column({ type: DataType.TEXT, unique: 'idx_holiday_date_country' })
    holiday_key!: string; // e.g., 'IN_2024_REPUBLIC_DAY'

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default GlobalHoliday;
