import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { AdminSession } from './AdminSession.model';

@Table({ tableName: 'admin_refresh_tokens', schema: 'root', timestamps: true, underscored: true })
export class AdminRefreshToken extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => AdminSession)
    @Column({ type: DataType.UUID, allowNull: false })
    session_id!: string;

    @BelongsTo(() => AdminSession)
    session!: AdminSession;

    @Column({ type: DataType.TEXT, allowNull: false })
    token_hash!: string;

    @Column({ type: DataType.DATE, allowNull: false })
    expires_at!: Date;

    @Column(DataType.DATE)
    revoked_at!: Date | null;

    @Column(DataType.TEXT)
    revoked_reason!: string | null;

    // Token family for rotation detection
    @Column({ type: DataType.UUID, allowNull: false })
    token_family!: string;

    // Rotation counter to detect reuse
    @Default(0)
    @Column(DataType.INTEGER)
    rotation_count!: number;
}

export default AdminRefreshToken;
