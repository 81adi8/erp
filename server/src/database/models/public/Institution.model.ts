import { Table, Column, Model, DataType, Default, Index, ForeignKey, BelongsTo, AllowNull } from 'sequelize-typescript';

@Table({ tableName: 'institutions', schema: 'public', timestamps: true, underscored: true })
export class Institution extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.TEXT, unique: true, allowNull: false })
    code!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Index
    @Column({ type: DataType.TEXT, allowNull: false })
    type!: string; // school, coaching, university, etc.

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Index({ unique: true })
    @Column({ type: DataType.TEXT, allowNull: false })
    slug!: string;

    @Index({ unique: true })
    @Column({ type: DataType.TEXT, allowNull: true })
    sub_domain!: string;

    @Column({ type: DataType.TEXT })
    domainUrl!: string;

    @Index
    @Column({ type: DataType.TEXT, allowNull: false })
    db_schema!: string; // e.g., 'tenant_xyz'

    @Index
    @Default('active')
    @Column({ type: DataType.TEXT })
    status!: string; // active, suspended, trial, etc.

    @Default({})
    @Column(DataType.JSONB)
    settings!: any;

    @ForeignKey(() => require('./Plan.model').Plan)
    @Index
    @Column(DataType.UUID)
    plan_id!: string;

    @BelongsTo(() => require('./Plan.model').Plan)
    plan!: import('./Plan.model').Plan;

    // Quota & Billing Fields for SaaS Scale
    @Column(DataType.INTEGER)
    max_users?: number;

    @Column(DataType.INTEGER)
    max_students?: number;

    @Column(DataType.INTEGER)
    storage_quota_mb?: number;

    @Column(DataType.INTEGER)
    used_storage_mb?: number;

    @Index
    @Column(DataType.DATE)
    subscription_expires_at?: Date;

    @Default('active')
    @Column({ type: DataType.TEXT })
    billing_status?: string; // active, trial, past_due, canceled

    @Column(DataType.DATE)
    trial_ends_at?: Date;
}

export default Institution;
