import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';

@Table({ tableName: 'academic_years', timestamps: true, underscored: true })
export class AcademicYear extends Model {
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

    @Column({ type: DataType.DATEONLY, allowNull: false })
    start_date!: Date;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    end_date!: Date;

    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active!: boolean;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active_record!: boolean;
}

export default AcademicYear;
