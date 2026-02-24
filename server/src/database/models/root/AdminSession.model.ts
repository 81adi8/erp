import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Admin } from './Admin.model';

@Table({ tableName: 'admin_sessions', schema: 'root', timestamps: true, underscored: true })
export class AdminSession extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Admin)
    @Column({ type: DataType.UUID, allowNull: false })
    admin_id!: string;

    @BelongsTo(() => Admin)
    admin!: Admin;

    @Column(DataType.TEXT)
    token_hash!: string;

    @Column(DataType.JSONB)
    device_info!: any;

    @Column(DataType.TEXT)
    ip!: string;

    @Column(DataType.DATE)
    revoked_at!: Date | null;

    @Column(DataType.TEXT)
    revoke_reason!: string | null;

    @Column(DataType.DATE)
    last_active_at!: Date;
}

export default AdminSession;
