import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User.model';

/**
 * UserPermission Model - Stores permissions delegated by admin to users
 * Teachers, Students, Staff get permissions here (within admin's range)
 */
@Table({ tableName: 'user_permissions', timestamps: true, underscored: true })
export class UserPermission extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    user_id!: string; // User receiving permission

    @Column({ type: DataType.UUID, allowNull: false })
    permission_id!: string; // References public.permissions

    @Column({ type: DataType.TEXT, allowNull: false })
    permission_key!: string; // Denormalized for fast lookup

    @Column({ type: DataType.UUID })
    granted_by!: string; // Admin who granted this

    @Default(DataType.NOW)
    @Column(DataType.DATE)
    granted_at!: Date;

    @Column(DataType.DATE)
    expires_at?: Date; // Optional expiry

    // Associations
    @BelongsTo(() => User)
    user?: User;
}

export default UserPermission;
