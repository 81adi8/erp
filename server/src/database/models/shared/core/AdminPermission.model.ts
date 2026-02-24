import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.model';

/**
 * AdminPermission Model - Stores permissions granted to institution admin
 * These are copied from the plan during institution creation
 * Admin can only delegate permissions they have here
 */
@Table({ tableName: 'admin_permissions', timestamps: true, underscored: true })
export class AdminPermission extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    user_id!: string; // Admin user ID

    @Column({ type: DataType.UUID, allowNull: false })
    permission_id!: string; // References public.permissions

    @Column({ type: DataType.TEXT, allowNull: false })
    permission_key!: string; // Denormalized for fast lookup

    @Column({ type: DataType.UUID })
    institution_id?: string;

    @Default(DataType.NOW)
    @Column(DataType.DATE)
    granted_at!: Date;

    // Associations
    @BelongsTo(() => User)
    admin?: User;
}

export default AdminPermission;
