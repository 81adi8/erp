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
import { Class } from '../academics/class/Class.model';
import { FeeCategory } from './FeeCategory.model';
import { StudentFeeAssignment } from './StudentFeeAssignment.model';
import { FeePayment } from './FeePayment.model';

export enum FeeFrequency {
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    ANNUALLY = 'annually',
    ONE_TIME = 'one_time',
}

@Table({
    tableName: 'fee_structures',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['institution_id', 'academic_year_id', 'fee_category_id', 'class_id'],
            name: 'fee_structures_institution_year_category_class_unique',
        },
    ],
})
export class FeeStructure extends Model {
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

    @ForeignKey(() => FeeCategory)
    @Column({ type: DataType.UUID, allowNull: false })
    fee_category_id!: string;

    @BelongsTo(() => FeeCategory)
    fee_category!: FeeCategory;

    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: false })
    class_id!: string;

    @BelongsTo(() => Class)
    class!: Class;

    @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
    amount!: number;

    @Column({
        type: DataType.ENUM(...Object.values(FeeFrequency)),
        allowNull: false,
    })
    frequency!: FeeFrequency;

    @Column({ type: DataType.INTEGER, allowNull: true })
    due_day?: number;

    @Default(0)
    @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
    late_fee_per_day!: number;

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active!: boolean;

    @HasMany(() => StudentFeeAssignment)
    student_fee_assignments?: StudentFeeAssignment[];

    @HasMany(() => FeePayment)
    fee_payments?: FeePayment[];
}

export default FeeStructure;
