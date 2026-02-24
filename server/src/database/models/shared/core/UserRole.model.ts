import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { User } from './User.model';
import { Role } from './Role.model';
import { Institution } from '../../public/Institution.model';

/**
 * Assignment type determines how the role was assigned to the user
 * - 'system_default': Auto-assigned from system/public default role
 * - 'custom_default': Auto-assigned from tenant's custom default role
 * - 'explicit': Manually assigned by admin (won't be affected by default changes)
 */
export type RoleAssignmentType = 'system_default' | 'custom_default' | 'explicit';

@Table({
    tableName: 'user_roles',
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ['user_id', 'role_id'], name: 'user_roles_unique' },
        { fields: ['assignment_type'], name: 'user_roles_assignment_type_idx' }
    ]
})
export class UserRole extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Index
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    user_id!: string;

    @BelongsTo(() => User)
    user?: User;

    @Index
    @ForeignKey(() => Role)
    @Column({ type: DataType.UUID, allowNull: false })
    role_id!: string;

    @BelongsTo(() => Role)
    role?: Role;

    @Index
    @ForeignKey(() => Institution)
    @Column(DataType.UUID)
    institution_id?: string;

    @Column(DataType.UUID)
    assigned_by?: string;

    /**
     * How this role was assigned:
     * - 'system_default': Auto-assigned from system role (global cache)
     * - 'custom_default': Auto-assigned from custom role (tenant cache)
     * - 'explicit': Manually assigned by admin
     */
    @Default('explicit')
    @Column({ type: DataType.TEXT })
    assignment_type?: RoleAssignmentType;

    /**
     * Original role ID if this assignment was created due to role migration
     * Used for audit trail when tracking role changes
     */
    @Column({ type: DataType.UUID })
    source_role_id?: string;

    /**
     * When this specific role assignment was made
     */
    @Default(DataType.NOW)
    @Column(DataType.DATE)
    assigned_at?: Date;
}

export default UserRole;
