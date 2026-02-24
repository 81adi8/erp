import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { AcademicSession } from './AcademicSession.model';
import { Institution } from '../../../public/Institution.model';
import { Op } from 'sequelize';

@Table({
    tableName: 'session_holidays',
    timestamps: true,
    underscored: true,
    defaultScope: {
        where: {
            institution_id: { [Op.not]: null },
        },
    },
})
export class SessionHoliday extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => AcademicSession)
    @Column({ type: DataType.UUID, allowNull: false })
    session_id!: string;

    @BelongsTo(() => AcademicSession)
    session!: AcademicSession;

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

    @Column(DataType.TEXT)
    description?: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_gazetted!: boolean;

    @Default('SCHOOL')
    @Column(DataType.ENUM('NATIONAL', 'REGIONAL', 'SCHOOL', 'OTHER'))
    holiday_type!: string;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default SessionHoliday;
