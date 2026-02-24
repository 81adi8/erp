import { Table, Column, Model, DataType, Default, BelongsTo, ForeignKey, HasMany, BelongsToMany, Index } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { Session } from './Session.model';
import { Role } from './Role.model';
import { UserRole } from './UserRole.model';
import { RoleType } from '../../../../core/constants/roles';
import { Teacher } from '../../school/academics/staff/Teacher.model';
import { HasOne } from 'sequelize-typescript';

@Table({ tableName: 'users', timestamps: true, underscored: true, paranoid: true })
export class User extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Index
    @Column({ type: DataType.TEXT, unique: true, allowNull: false, validate: { isEmail: true } })
    email!: string;

    @Index
    @Column(DataType.TEXT)
    phone?: string;

    @Column(DataType.TEXT)
    first_name?: string;

    @Column(DataType.TEXT)
    last_name?: string;

    // Note: allowNull for password_hash because IdP users (Keycloak) don't have local passwords
    @Column({ type: DataType.TEXT, allowNull: true })
    password_hash?: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_email_verified!: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_phone_verified!: boolean;

    @Index
    @ForeignKey(() => Institution)
    @Column(DataType.UUID)
    institution_id?: string;

    @BelongsTo(() => Institution)
    institution?: Institution;

    @Index
    @Column({ type: DataType.TEXT, unique: true })
    keycloak_id?: string;

    @Index
    @Column({ type: DataType.ENUM(...Object.values(RoleType)) })
    user_type?: RoleType;

    @Column(DataType.UUID)
    created_by?: string;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: Record<string, unknown>;

    // ── TASK-E1.1: MFA fields ─────────────────────────────────────────────────
    @Default(false)
    @Column(DataType.BOOLEAN)
    mfa_enabled!: boolean;

    @Column({ type: DataType.TEXT, allowNull: true })
    mfa_secret?: string;

    @Column({ type: DataType.JSONB, allowNull: true })
    mfa_backup_codes?: string[];

    @Column({ type: DataType.DATE, allowNull: true })
    mfa_verified_at?: Date;

    // ── TASK-E1.1: Hybrid auth provider ──────────────────────────────────────
    @Default('password')
    @Column({ type: DataType.TEXT, allowNull: false })
    auth_provider!: string;  // 'password' | 'keycloak' | 'google' | 'azure'

    // ── TASK-E1.1: IP allowlist (optional per-user restriction) ──────────────
    @Column({ type: DataType.JSONB, allowNull: true })
    ip_allowlist?: string[];

    // ── TASK-E1.1: Login tracking ─────────────────────────────────────────────
    @Column({ type: DataType.DATE, allowNull: true })
    last_login_at?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    last_login_ip?: string;

    @Column({ type: DataType.DATE, field: 'deleted_at' })
    deletedAt?: Date;

    @HasMany(() => Session)
    sessions?: Session[];

    @BelongsToMany(() => Role, () => UserRole)
    roles?: Role[];

    @HasOne(() => Teacher)
    teacher?: Teacher;
}

export default User;
