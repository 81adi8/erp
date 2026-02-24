/**
 * NotificationTemplate Model
 * Reusable templates for notifications
 */
import {
    Table,
    Column,
    Model,
    DataType,
    Default,
    CreatedAt,
    UpdatedAt,
    ForeignKey,
    BelongsTo,
} from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { Op } from 'sequelize';

export enum TemplateType {
    NOTICE = 'notice',
    FEE_REMINDER = 'fee_reminder',
    ATTENDANCE_ALERT = 'attendance_alert',
    EXAM_RESULT = 'exam_result',
    CUSTOM = 'custom',
}

@Table({
    tableName: 'notification_templates',
    timestamps: true,
    underscored: true,
    defaultScope: {
        where: {
            institution_id: { [Op.not]: null },
        },
    },
})
export class NotificationTemplate extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution?: Institution;

    @Column({ type: DataType.STRING(100), allowNull: false })
    name!: string;

    @Column({ type: DataType.STRING(100), allowNull: false })
    slug!: string; // Unique identifier for programmatic use

    @Default(TemplateType.CUSTOM)
    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    type!: TemplateType;

    @Column({ type: DataType.STRING(300), allowNull: false })
    title_template!: string; // Supports {{variable}} placeholders

    @Column({ type: DataType.TEXT, allowNull: false })
    message_template!: string; // Supports {{variable}} placeholders

    @Column({ type: DataType.JSONB, allowNull: true })
    variables?: string[]; // List of expected variables

    @Default(true)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_active!: boolean;

    @CreatedAt
    @Column({ type: DataType.DATE })
    created_at!: Date;

    @UpdatedAt
    @Column({ type: DataType.DATE })
    updated_at!: Date;
}

export default NotificationTemplate;
