import {
    Table,
    Column,
    Model,
    DataType,
    Default,
    ForeignKey,
    BelongsTo,
} from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { Student } from './Student.model';
import { User } from '../../../shared/core/User.model';

export enum StudentDocumentType {
    BIRTH_CERTIFICATE = 'birth_certificate',
    TRANSFER_CERTIFICATE = 'transfer_certificate',
    AADHAAR = 'aadhaar',
    MARKSHEET = 'marksheet',
    PHOTO = 'photo',
    MEDICAL_RECORD = 'medical_record',
    ADDRESS_PROOF = 'address_proof',
    OTHER = 'other',
}

@Table({
    tableName: 'student_documents',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        {
            fields: ['student_id'],
            name: 'student_documents_student_id_idx',
        },
        {
            fields: ['institution_id', 'document_type'],
            name: 'student_documents_institution_type_idx',
        },
    ],
})
export class StudentDocument extends Model {
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

    @Column({
        type: DataType.ENUM(...Object.values(StudentDocumentType)),
        allowNull: false,
    })
    document_type!: StudentDocumentType;

    @Column({ type: DataType.STRING(255), allowNull: false })
    file_name!: string;

    @Column({ type: DataType.STRING(1024), allowNull: false })
    file_url!: string;

    @Column({ type: DataType.INTEGER, allowNull: true })
    file_size?: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    uploaded_by!: string;

    @BelongsTo(() => User, { foreignKey: 'uploaded_by', as: 'uploadedByUser' })
    uploaded_by_user!: User;

    @Column({ type: DataType.DATE, allowNull: false })
    uploaded_at!: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    verified_at?: Date;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    verified_by?: string;

    @BelongsTo(() => User, { foreignKey: 'verified_by', as: 'verifiedByUser' })
    verified_by_user?: User;

    @Column({ type: DataType.STRING(500), allowNull: true })
    remarks?: string;
}

export default StudentDocument;