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
import { AcademicSession } from '../academics/session/AcademicSession.model';
import { Student } from '../academics/student/Student.model';
import { FeeStructure } from './FeeStructure.model';
import { FeeDiscount } from './FeeDiscount.model';

@Table({
    tableName: 'student_fee_assignments',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['student_id', 'fee_structure_id', 'academic_year_id'],
            name: 'student_fee_assignments_student_structure_year_unique',
        },
    ],
})
export class StudentFeeAssignment extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

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

    @ForeignKey(() => FeeStructure)
    @Column({ type: DataType.UUID, allowNull: false })
    fee_structure_id!: string;

    @BelongsTo(() => FeeStructure)
    fee_structure!: FeeStructure;

    @ForeignKey(() => AcademicSession)
    @Column({ type: DataType.UUID, allowNull: false })
    academic_year_id!: string;

    @BelongsTo(() => AcademicSession)
    academic_session!: AcademicSession;

    @ForeignKey(() => FeeDiscount)
    @Column({ type: DataType.UUID, allowNull: true })
    discount_id?: string;

    @BelongsTo(() => FeeDiscount)
    discount?: FeeDiscount;

    @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
    discount_override_amount?: number;

    @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
    final_amount!: number;
}

export default StudentFeeAssignment;
