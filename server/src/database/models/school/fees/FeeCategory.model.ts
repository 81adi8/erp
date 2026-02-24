import {
    Table,
    Column,
    Model,
    DataType,
    Default,
    ForeignKey,
    BelongsTo,
    HasMany,
} from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { AcademicSession } from '../academics/session/AcademicSession.model';
import { FeeStructure } from './FeeStructure.model';

@Table({
    tableName: 'fee_categories',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['institution_id', 'academic_year_id', 'name'],
            name: 'fee_categories_institution_year_name_unique',
        },
    ],
})
export class FeeCategory extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => AcademicSession)
    @Column({ type: DataType.UUID, allowNull: false })
    academic_year_id!: string;

    @BelongsTo(() => AcademicSession)
    academic_session!: AcademicSession;

    @Column({ type: DataType.STRING(150), allowNull: false })
    name!: string;

    @Column({ type: DataType.STRING(500), allowNull: true })
    description?: string;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active!: boolean;

    @HasMany(() => FeeStructure)
    fee_structures?: FeeStructure[];
}

export default FeeCategory;
