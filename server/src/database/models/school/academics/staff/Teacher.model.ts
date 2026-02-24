import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../../shared/core/User.model';
import { Institution } from '../../../public/Institution.model';

@Table({ tableName: 'teachers', timestamps: true, underscored: true })
export class Teacher extends Model {
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

    @Column({ type: DataType.TEXT, unique: true })
    employee_id?: string;

    @Column(DataType.TEXT)
    qualification?: string;

    @Column(DataType.TEXT)
    designation?: string;

    @Column(DataType.TEXT)
    specialization?: string;

    @Column(DataType.INTEGER)
    experience_years?: number;

    @Column(DataType.DATEONLY)
    date_of_joining?: Date;

    @Column(DataType.TEXT)
    phone?: string;

    @Column(DataType.TEXT)
    email?: string;

    @Column(DataType.TEXT)
    address?: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Column(DataType.TEXT)
    biography?: string;

    @Default({})
    @Column(DataType.JSONB)
    skills!: string[];

    @Column(DataType.TEXT)
    emergency_contact_name?: string;

    @Column(DataType.TEXT)
    emergency_contact_phone?: string;

    @Default({})
    @Column(DataType.JSONB)
    documents!: any; // URLs for degrees, IDs, etc.

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default Teacher;
