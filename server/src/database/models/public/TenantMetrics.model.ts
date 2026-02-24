import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Institution } from './Institution.model';

/**
 * TenantMetrics Model (PUBLIC Schema)
 * 
 * Aggregated metrics for each tenant, updated periodically.
 * Used for monitoring, billing, and analytics dashboards.
 */
@Table({ tableName: 'tenant_metrics', schema: 'public', timestamps: true, underscored: true })
export class TenantMetrics extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Index({ unique: true })
    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution?: Institution;

    // User counts
    @Default(0)
    @Column(DataType.INTEGER)
    total_users!: number;

    @Default(0)
    @Column(DataType.INTEGER)
    active_users_7d!: number;

    @Default(0)
    @Column(DataType.INTEGER)
    active_users_30d!: number;

    // Entity counts
    @Default(0)
    @Column(DataType.INTEGER)
    total_students!: number;

    @Default(0)
    @Column(DataType.INTEGER)
    total_teachers!: number;

    @Default(0)
    @Column(DataType.INTEGER)
    total_staff!: number;

    // Storage metrics
    @Default(0)
    @Column(DataType.INTEGER)
    storage_used_mb!: number;

    // Activity metrics
    @Column(DataType.DATE)
    last_activity_at?: Date;

    @Default(0)
    @Column(DataType.INTEGER)
    api_requests_30d!: number;

    // Health indicators
    @Default('healthy')
    @Column(DataType.TEXT)
    health_status!: string; // healthy, warning, critical

    // Raw metrics data for custom dashboards
    @Default({})
    @Column(DataType.JSONB)
    raw_metrics!: Record<string, any>;

    // When metrics were last calculated
    @Column(DataType.DATE)
    calculated_at?: Date;
}

export default TenantMetrics;
