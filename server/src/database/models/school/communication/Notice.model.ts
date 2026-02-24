/**
 * Notice Model
 * DB table: notices (created in migration: 20260219_missing_modules_fees_notices_institution_id.sql)
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
    DeletedAt,
} from 'sequelize-typescript';
import { User } from '../../shared/core/User.model';
import { Class } from '../academics/class/Class.model';
import { Section } from '../academics/class/Section.model';

export enum NoticeType {
    GENERAL = 'general',
    EXAM = 'exam',
    HOLIDAY = 'holiday',
    EVENT = 'event',
    URGENT = 'urgent',
}

export enum TargetAudience {
    ALL = 'all',
    STUDENTS = 'students',
    TEACHERS = 'teachers',
    PARENTS = 'parents',
    STAFF = 'staff',
}

@Table({
    tableName: 'notices',
    timestamps: true,
    underscored: true,
    paranoid: true,
})
export class Notice extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.STRING(300), allowNull: false })
    title!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    content!: string;

    @Default(NoticeType.GENERAL)
    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    notice_type!: NoticeType;

    @Default(TargetAudience.ALL)
    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    target_audience!: TargetAudience;

    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: true })
    class_id?: string;

    @BelongsTo(() => Class)
    class?: Class;

    @ForeignKey(() => Section)
    @Column({ type: DataType.UUID, allowNull: true })
    section_id?: string;

    @BelongsTo(() => Section)
    section?: Section;

    @Column({ type: DataType.DATE, allowNull: true })
    published_at?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    expires_at?: Date;

    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_published!: boolean;

    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false })
    is_pinned!: boolean;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    created_by?: string;

    @BelongsTo(() => User)
    creator?: User;

    @CreatedAt
    @Column({ type: DataType.DATE })
    created_at!: Date;

    @UpdatedAt
    @Column({ type: DataType.DATE })
    updated_at!: Date;

    @DeletedAt
    @Column({ type: DataType.DATE })
    deleted_at?: Date;
}

export default Notice;