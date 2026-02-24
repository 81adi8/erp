import { Table, Column, Model, DataType, Default, ForeignKey, HasMany, BelongsTo, Index } from 'sequelize-typescript';
import { User } from './User.model';
import { RefreshToken } from './RefreshToken.model';

@Table({ tableName: 'sessions', timestamps: true, underscored: true })
export class Session extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Index
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    user_id!: string;

    @BelongsTo(() => User)
    user!: User;

    @Index
    @Column(DataType.UUID)
    institution_id?: string;

    @Column(DataType.TEXT)
    device_id?: string;

    @Column(DataType.JSONB)
    device_info?: any;

    @Column(DataType.INET)
    ip?: string;

    @Column(DataType.TEXT)
    user_agent?: string;

    // ── TASK-E1.1: Device intelligence ────────────────────────────────────────
    @Column({ type: DataType.TEXT, allowNull: true })
    device_type?: string;  // 'desktop' | 'mobile' | 'tablet' | 'unknown'

    @Column({ type: DataType.TEXT, allowNull: true })
    geo_region?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    user_agent_hash?: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_new_device!: boolean;

    // ── TASK-E1.1: MFA session state ──────────────────────────────────────────
    @Default(false)
    @Column(DataType.BOOLEAN)
    mfa_verified!: boolean;

    @Column({ type: DataType.DATE, allowNull: true })
    mfa_verified_at?: Date;

    @Default(DataType.NOW)
    @Column(DataType.DATE)
    last_active_at!: Date;

    // Session TTL - for automatic cleanup
    @Index
    @Column({ type: DataType.DATE })
    expires_at?: Date;

    @Index
    @Column(DataType.DATE)
    revoked_at?: Date;

    @Column(DataType.TEXT)
    revoke_reason?: string;

    @HasMany(() => RefreshToken)
    refresh_tokens?: RefreshToken[];
}

export default Session;
