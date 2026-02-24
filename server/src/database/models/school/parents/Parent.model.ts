import { Table, Column, Model, DataType, Default, ForeignKey, BelongsToMany } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { Student } from '../academics/student/Student.model';
import { StudentParent } from './StudentParent.model';

/**
 * Parent model - parent/guardian information
 * School-specific model
 */
@Table({ tableName: 'parents', timestamps: true, underscored: true })
export class Parent extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    first_name!: string;

    @Column(DataType.TEXT)
    last_name?: string;

    @Column(DataType.TEXT)
    email?: string;

    @Column(DataType.TEXT)
    phone!: string;

    @Column(DataType.TEXT)
    alternate_phone?: string;

    @Column(DataType.TEXT)
    relation?: string; // FATHER, MOTHER, GUARDIAN

    @Column(DataType.TEXT)
    occupation?: string;

    @Column(DataType.TEXT)
    address?: string;

    @Column(DataType.UUID)
    user_id?: string; // Link to User for login access

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @BelongsToMany(() => Student, () => StudentParent)
    students?: Student[];
}

export default Parent;
