import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Role } from './Role.model';
import { RoleType } from '../../../../core/constants/roles';

/**
 * TenantRoleConfig Model
 * 
 * Tracks default role mappings per user type per tenant.
 * When admin switches default roles, this config is updated but
 * existing users retain their previous role assignment.
 * 
 * Key Features:
 * - Tracks which role is the default for each user type (student, teacher, etc.)
 * - Distinguishes between system roles (global cache) and custom roles (tenant cache)
 * - Maintains audit trail of previous role configurations
 */
@Table({
    tableName: 'tenant_role_configs',
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ['user_type'], name: 'tenant_role_configs_user_type_unique' }
    ]
})
export class TenantRoleConfig extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    /**
     * User type this config applies to
     * Examples: 'student', 'teacher', 'staff', 'parent', 'admin'
     */
    @Index
    @Column({
        type: DataType.ENUM(...Object.values(RoleType)),
        allowNull: false
    })
    user_type!: RoleType;

    /**
     * The currently active default role for this user type
     */
    @ForeignKey(() => Role)
    @Column({ type: DataType.UUID, allowNull: false })
    default_role_id!: string;

    @BelongsTo(() => Role, 'default_role_id')
    defaultRole?: Role;

    /**
     * Previous role ID (for audit trail and potential rollback)
     */
    @Column({ type: DataType.UUID })
    previous_role_id?: string;

    /**
     * Whether the default role is a system role (cached globally) or custom (cached per tenant)
     * - true: Role uses plan-scoped caching (system/public role)
     * - false: Role uses tenant-scoped caching (custom role)
     */
    @Default(true)
    @Column(DataType.BOOLEAN)
    is_system_role!: boolean;

    /**
     * Role slug for cache key construction
     */
    @Column({ type: DataType.TEXT })
    role_slug?: string;

    /**
     * Plan ID for system roles (used in cache key)
     */
    @Column({ type: DataType.UUID })
    plan_id?: string;

    /**
     * When the config was last changed
     */
    @Column(DataType.DATE)
    last_changed_at?: Date;

    /**
     * Who made the last change
     */
    @Column({ type: DataType.UUID })
    changed_by?: string;

    /**
     * Additional metadata (reason for change, notes, etc.)
     */
    @Default({})
    @Column({ type: DataType.JSONB })
    metadata!: Record<string, any>;
}

export default TenantRoleConfig;
