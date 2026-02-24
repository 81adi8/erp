import {
    Table,
    Column,
    Model,
    DataType,
    Default,
    ForeignKey,
    BelongsTo,
} from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { Student } from '../academics/student/Student.model';
import { AcademicSession } from '../academics/session/AcademicSession.model';
import { FeeStructure } from './FeeStructure.model';
import { User } from '../../shared/core/User.model';

export enum FeePaymentMode {
    CASH = 'cash',
    CHEQUE = 'cheque',
    ONLINE = 'online',
    UPI = 'upi',
    DD = 'dd',
}

export enum FeePaymentStatus {
    SUCCESS = 'success',
    PENDING = 'pending',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

@Table({
    tableName: 'fee_payments',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['institution_id', 'receipt_number'],
            name: 'fee_payments_institution_receipt_unique',
        },
        {
            unique: true,
            fields: ['idempotency_key'],
            name: 'fee_payments_idempotency_key_unique',
        },
        {
            fields: ['student_id', 'academic_year_id'],
            name: 'fee_payments_student_academic_year_idx',
        },
    ],
})
export class FeePayment extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    // FEE-01 FIX: Added idempotency_key for duplicate payment prevention
    @Column({ type: DataType.STRING(100), allowNull: true, unique: true })
    idempotency_key?: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => Student)
    @Column({ type: DataType.UUID, allowNull: false })
    student_id!: string;

    @BelongsTo(() => Student)
    student!: Student;

    @ForeignKey(() => AcademicSession)
    @Column({ type: DataType.UUID, allowNull: false })
    academic_year_id!: string;

    @BelongsTo(() => AcademicSession)
    academic_session!: AcademicSession;

    @Column({ type: DataType.STRING(100), allowNull: false })
    receipt_number!: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    payment_date!: Date;

    @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
    amount_paid!: number;

    @Column({
        type: DataType.ENUM(...Object.values(FeePaymentMode)),
        allowNull: false,
    })
    payment_mode!: FeePaymentMode;

    @Column({ type: DataType.STRING(255), allowNull: true })
    payment_reference?: string;

    @ForeignKey(() => FeeStructure)
    @Column({ type: DataType.UUID, allowNull: false })
    fee_structure_id!: string;

    @BelongsTo(() => FeeStructure)
    fee_structure!: FeeStructure;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    collected_by?: string;

    @BelongsTo(() => User)
    collector?: User;

    // FEE-04 FIX: Added voided_by field for refund audit trail
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    voided_by?: string;

    @BelongsTo(() => User, 'voided_by')
    voidedByUser?: User;

    @Column({ type: DataType.STRING(500), allowNull: true })
    remarks?: string;

    @Default(FeePaymentStatus.SUCCESS)
    @Column({
        type: DataType.ENUM(...Object.values(FeePaymentStatus)),
        allowNull: false,
    })
    status!: FeePaymentStatus;
}

export default FeePayment;
