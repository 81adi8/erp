import {
    Table,
    Column,
    Model,
    DataType,
    Default,
    ForeignKey,
    BelongsTo,
    HasMany,
    BelongsToMany,
} from 'sequelize-typescript';
import { User } from '../../../shared/core/User.model';
import { Institution } from '../../../public/Institution.model';
import { StudentEnrollment } from './StudentEnrollment.model';
import { StudentDocument } from './StudentDocument.model';
import { ParentProfile } from './ParentProfile.model';
import { StudentParentLink } from './StudentParent.model';
import { StudentAttendance } from '../../attendance/StudentAttendance.model';

@Table({
    tableName: 'students',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['institution_id', 'admission_number'],
            name: 'students_unique_admission_per_institution',
        },
    ],
})
export class Student extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    user_id!: string;

    @BelongsTo(() => User)
    user!: User;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @Column({ type: DataType.TEXT, unique: false })
    admission_number?: string;

    @Column(DataType.TEXT)
    roll_number?: string;

    @Column(DataType.TEXT)
    mother_tongue?: string;

    @Column(DataType.DATEONLY)
    admission_date?: Date;

    @Column(DataType.DATEONLY)
    date_of_birth?: Date;

    @Column(DataType.ENUM('male', 'female', 'other'))
    gender?: string;

    @Column(DataType.TEXT)
    blood_group?: string;

    @Column(DataType.TEXT)
    religion?: string;

    @Column(DataType.TEXT)
    caste?: string;

    @Column(DataType.TEXT)
    category?: string; // e.g., General, OBC, SC, ST

    @Column(DataType.TEXT)
    aadhar_number?: string;

    @Column(DataType.TEXT)
    phone?: string;

    @Column(DataType.TEXT)
    email?: string;

    @Column(DataType.TEXT)
    current_address?: string;

    @Column(DataType.TEXT)
    permanent_address?: string;

    @Column(DataType.TEXT)
    emergency_contact_name?: string;

    @Column(DataType.TEXT)
    emergency_contact_phone?: string;

    @Column(DataType.TEXT)
    emergency_contact_relation?: string;

    @Default({})
    @Column(DataType.JSONB)
    family_details!: any; // e.g., { father_name: "...", mother_name: "..." }

    @Default({})
    @Column(DataType.JSONB)
    previous_school_details!: any; // e.g., { school_name: "...", last_class: "..." }

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_transport_required!: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_hostel_required!: boolean;

    @Default({})
    @Column(DataType.JSONB)
    document_urls!: any; // URLs to birth certificates, etc.

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;

    @Column(DataType.TEXT)
    medical_history?: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    // STU-02 FIX: Added is_locked and is_archived for record immutability after graduation
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_locked!: boolean; // When true, student record cannot be modified

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_archived!: boolean; // For graduated/withdrawn students

    @HasMany(() => StudentEnrollment)
    enrollments!: StudentEnrollment[];

    @HasMany(() => StudentDocument)
    documents?: StudentDocument[];

    @HasMany(() => StudentAttendance, {
        foreignKey: 'studentId',
        sourceKey: 'id',
        as: 'attendance_records',
    })
    attendance_records?: StudentAttendance[];

    @BelongsToMany(() => ParentProfile, () => StudentParentLink)
    parent_profiles?: ParentProfile[];
}

export default Student;
