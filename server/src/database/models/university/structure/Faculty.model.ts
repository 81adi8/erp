import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { User } from '../../shared/core/User.model';

/**
 * Faculty - university faculty/professor
 * University-specific model
 */
@Table({ tableName: 'faculty', timestamps: true, underscored: true })
export class Faculty extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    user_id!: string;

    @BelongsTo(() => User)
    user!: User;

    @Column(DataType.TEXT)
    employee_id?: string;

    @Column(DataType.TEXT)
    designation?: string; // Professor, Associate Prof, Assistant Prof

    @Column(DataType.TEXT)
    department_id?: string; // FK to Department

    @Column(DataType.TEXT)
    specialization?: string;

    @Column(DataType.TEXT)
    qualification?: string; // PhD, M.Tech, etc.

    @Column(DataType.DATE)
    join_date?: Date;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;
}

export default Faculty;
