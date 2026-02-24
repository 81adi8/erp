/**
 * Notification Model
 * Stores individual notifications for users
 */
import {
    Table,
    Column,
    Model,
    DataType,
    Default,
    ForeignKey,
    BelongsTo,
    CreatedAt,
    UpdatedAt,
} from 'sequelize-typescript';
import { User } from '../../shared/core/User.model';
import { Institution } from '../../public/Institution.model';
import { Op } from 'sequelize';

export enum NotificationStatus {
    PENDING = 'pending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
}

export enum NotificationChannel {
    IN_APP = 'in_app',
    EMAIL = 'email',
    SMS = 'sms',
    PUSH = 'push',
}

@Table({
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    defaultScope: {
        where: {
            institution_id: { [Op.not]: null },
        },
    },
})
export class Notification extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution?: Institution;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    user_id!: string;

    @BelongsTo(() => User)
    user?: User;

    @Column({ type: DataType.STRING(300), allowNull: false })
    title!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    message!: string;

    @Column({ type: DataType.STRING(100), allowNull: true })
    type?: string; // notice, fee_reminder, attendance_alert, etc.

    @Column({ type: DataType.JSONB, allowNull: true })
    metadata?: Record<string, any>; // Additional context (notice_id, student_id, etc.)

    @Default(NotificationChannel.IN_APP)
    @Column({
        type: DataType.STRING(20),
        allowNull: false,
    })
    channel!: NotificationChannel;

    @Default(NotificationStatus.PENDING)
    @Column({
        type: DataType.STRING(20),
        allowNull: false,
    })
    status!: NotificationStatus;

    @Column({ type: DataType.DATE, allowNull: true })
    sent_at?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    read_at?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    error_message?: string;

    @Column({ type: DataType.STRING(100), allowNull: true })
    idempotency_key?: string;

    @CreatedAt
    @Column({ type: DataType.DATE })
    created_at!: Date;

    @UpdatedAt
    @Column({ type: DataType.DATE })
    updated_at!: Date;
}

export default Notification;
