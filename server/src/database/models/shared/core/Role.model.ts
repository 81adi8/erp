import { Table, Column, Model, DataType, Default, BelongsToMany, HasMany, Index } from 'sequelize-typescript';
import { User } from './User.model';
import { UserRole } from './UserRole.model';
import { RolePermission } from './RolePermission.model';
import { Permission } from '../../public/Permission.model';
import { RoleType } from '../../../../core/constants/roles';

@Table({ tableName: 'roles', timestamps: true, underscored: true, paranoid: true })
export class Role extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Index
    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Index({ unique: true })
    @Column({ type: DataType.TEXT })
    slug?: string;

    @Column(DataType.TEXT)
    description?: string;

    @Index
    @Column({
        type: DataType.ENUM(...Object.values(RoleType)),
        allowNull: true
    })
    role_type?: RoleType;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_system?: boolean; // System roles cannot be deleted

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active?: boolean;

    // Asset type for two-tier caching:
    // - 'public': Initial template roles created by super_admin (cached globally per-plan)
    // - 'readonly': System roles that cannot be modified (cached globally per-plan)
    // - 'custom': Tenant-specific roles or modified copies (cached per-tenant)
    @Index
    @Default('public')
    @Column(DataType.TEXT)
    asset_type?: string;

    // Reference to original role when tenant creates a custom copy
    @Column({ type: DataType.UUID })
    source_role_id?: string;

    // Plan ID for plan-scoped caching (for public/readonly roles)
    @Index
    @Column({ type: DataType.UUID })
    plan_id?: string;

    @Column({ type: DataType.DATE, field: 'deleted_at' })
    deletedAt?: Date;

    @BelongsToMany(() => User, () => UserRole)
    users?: User[];

    @HasMany(() => RolePermission)
    rolePermissions?: RolePermission[];

    @BelongsToMany(() => Permission, () => RolePermission)
    permissions?: Permission[];

    @HasMany(() => require('../../public/AccessBundle.model').AccessBundle, {
        foreignKey: 'target_id',
        constraints: false,
        scope: {
            target_model: 'Role'
        }
    })
    accessBundles?: import('../../public/AccessBundle.model').AccessBundle[];
}

export default Role;
