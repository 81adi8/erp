import { Table, Column, Model, DataType, Default, Index } from 'sequelize-typescript';

/**
 * FeatureFlag Model (PUBLIC Schema)
 * 
 * Enables gradual feature rollouts across the platform.
 * Supports targeting by tenant type, specific institutions, and percentage rollouts.
 */
@Table({ tableName: 'feature_flags', schema: 'public', timestamps: true, underscored: true })
export class FeatureFlag extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Index({ unique: true })
    @Column({ type: DataType.TEXT, allowNull: false })
    key!: string; // e.g., 'new_dashboard', 'ai_grading', 'beta_reports'

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Column(DataType.TEXT)
    description?: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    enabled!: boolean;

    // Target specific tenant types: ['school', 'university', 'coaching']
    @Default([])
    @Column(DataType.JSONB)
    tenant_types!: string[];

    // Target specific plan IDs
    @Default([])
    @Column(DataType.JSONB)
    plan_ids!: string[];

    // Target specific institution IDs (for beta testing)
    @Default([])
    @Column(DataType.JSONB)
    institution_ids!: string[];

    // Percentage of tenants to roll out to (0-100)
    @Default(0)
    @Column(DataType.INTEGER)
    rollout_percentage!: number;

    // Start and end dates for time-limited features
    @Column(DataType.DATE)
    starts_at?: Date;

    @Column(DataType.DATE)
    ends_at?: Date;

    // Additional configuration
    @Default({})
    @Column(DataType.JSONB)
    config!: Record<string, any>;

    // Who created this flag
    @Column(DataType.UUID)
    created_by?: string;
}

export default FeatureFlag;
