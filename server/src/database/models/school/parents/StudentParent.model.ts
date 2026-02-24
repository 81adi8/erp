import { Table, Column, Model, DataType, Default, ForeignKey } from 'sequelize-typescript';
import { Student } from '../academics/student/Student.model';
import { Parent } from './Parent.model';

/**
 * StudentParent junction - links students to parents
 * School-specific model
 */
@Table({ tableName: 'student_parents', timestamps: true, underscored: true })
export class StudentParent extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Student)
    @Column({ type: DataType.UUID, allowNull: false })
    student_id!: string;

    @ForeignKey(() => Parent)
    @Column({ type: DataType.UUID, allowNull: false })
    parent_id!: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_primary!: boolean; // Primary contact

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_emergency_contact!: boolean;
}

export default StudentParent;
