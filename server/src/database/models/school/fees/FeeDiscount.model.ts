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
import { StudentFeeAssignment } from './StudentFeeAssignment.model';

export enum FeeDiscountType {
    PERCENTAGE = 'percentage',
    FLAT = 'flat',
}

@Table({
    tableName: 'fee_discounts',
    timestamps: true,
    underscored: true,
    paranoid: true,
})
export class FeeDiscount extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @Column({ type: DataType.STRING(150), allowNull: false })
    name!: string;

    @Column({
        type: DataType.ENUM(...Object.values(FeeDiscountType)),
        allowNull: false,
    })
    discount_type!: FeeDiscountType;

    @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
    discount_value!: number;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active!: boolean;

    @HasMany(() => StudentFeeAssignment)
    student_fee_assignments?: StudentFeeAssignment[];
}

export default FeeDiscount;
