import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Session } from './Session.model';

@Table({ tableName: 'refresh_tokens', timestamps: true, underscored: true })
export class RefreshToken extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Session)
    @Column({ type: DataType.UUID, allowNull: false })
    session_id!: string;

    @BelongsTo(() => Session)
    session!: Session;

    @Column({ type: DataType.TEXT, allowNull: false })
    token_hash!: string;

    @Column({ type: DataType.DATE, allowNull: false })
    expires_at!: Date;

    @Column(DataType.UUID)
    rotated_from?: string;

    @Column(DataType.DATE)
    revoked_at?: Date;

    @Column(DataType.TEXT)
    revoked_reason?: string;
}

export default RefreshToken;
