import { Table, Column, Model, DataType, Default, Index } from 'sequelize-typescript';

/**
 * AccessBundle - A collection of modules and permissions that can be linked to Plans or Roles.
 * This is polymorphic: it can target different models using target_model and target_id.
 */
@Table({ tableName: 'access_bundles', schema: 'public', timestamps: true, underscored: true })
export class AccessBundle extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Column({ type: DataType.TEXT })
    description!: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    // UI metadata fields
    @Column({ type: DataType.TEXT })
    parent_title!: string;

    @Column({ type: DataType.TEXT })
    parent_slug!: string;

    @Column({ type: DataType.TEXT })
    parent_icon!: string;

    // Tenant type categorization (e.g., 'school', 'university', 'coaching', 'all')
    @Index
    @Default('all')
    @Column({ type: DataType.TEXT })
    tenant_type!: string;

    // Asset type categorization:
    // - 'public' or 'initial': Template bundles that serve as starting points
    // - 'readonly': System bundles that should not be modified
    // - 'custom': Tenant-specific bundles (copies or new creations)
    @Index
    @Default('public')
    @Column({ type: DataType.TEXT })
    asset_type!: string;

    // Polymorphic association fields
    @Index
    @Column({ type: DataType.TEXT })
    target_model?: string; // e.g., 'Plan', 'Role'

    @Index
    @Column({ type: DataType.UUID })
    target_id?: string;

    // Store module IDs as JSON array (for backwards compatibility/easy access)
    @Default([])
    @Column({ type: DataType.JSONB })
    module_ids!: string[];

    // Store permission IDs as JSON array for custom permissions
    @Default([])
    @Column({ type: DataType.JSONB })
    permission_ids!: string[];

    // Store module-specific permission configurations
    // Format: { [module_id]: { allPermissions: boolean, permissionIds: string[] } }
    @Default({})
    @Column({ type: DataType.JSONB })
    module_permissions!: Record<string, { allPermissions: boolean; permissionIds: string[] }>;
}

export default AccessBundle;
