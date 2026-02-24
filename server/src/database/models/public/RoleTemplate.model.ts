import { Table, Column, Model, DataType, Default, Index, ForeignKey, BelongsTo, BelongsToMany } from 'sequelize-typescript';
import { Plan } from './Plan.model';
import { Permission } from './Permission.model';
import { RoleType } from '../../../core/constants/roles';

/**
 * RoleTemplate Model (PUBLIC Schema)
 * 
 * Templates for creating default roles with pre-assigned permissions.
 * Applied automatically when a new tenant is created based on their plan and type.
 */
@Table({ tableName: 'role_templates', schema: 'public', timestamps: true, underscored: true })
export class RoleTemplate extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "Teacher", "Student", "Admin"

    @Column({ type: DataType.TEXT, allowNull: false, unique: true })
    slug!: string; // e.g., "teacher", "student", unique identifier

    @Column({ type: DataType.TEXT })
    description?: string;

    @Index
    @Column({
        type: DataType.ENUM(...Object.values(RoleType)),
        allowNull: true
    })
    role_type?: RoleType;

    // Tenant type filter: 'school', 'university', 'coaching', 'all'
    @Index
    @Default('all')
    @Column({ type: DataType.TEXT })
    tenant_type!: string;

    // Optional plan association - null means available for all plans
    @ForeignKey(() => Plan)
    @Index
    @Column({ type: DataType.UUID })
    plan_id?: string;

    @BelongsTo(() => Plan)
    plan?: Plan;

    // System templates cannot be deleted
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_system!: boolean;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    // Asset type for two-tier caching: 'public' (template), 'readonly' (system), 'custom' (tenant)
    @Index
    @Default('public')
    @Column({ type: DataType.TEXT })
    asset_type!: string;

    // Display order in UI
    @Default(0)
    @Column(DataType.INTEGER)
    sort_order!: number;

    // Permission IDs as JSONB array for simplicity
    @Default([])
    @Column({ type: DataType.JSONB })
    permission_ids!: string[];

    // Additional metadata (icon, color, etc.)
    @Default({})
    @Column({ type: DataType.JSONB })
    metadata!: Record<string, any>;

    // Virtual association - permissions fetched separately for performance
    permissions?: Permission[];
}

export default RoleTemplate;
