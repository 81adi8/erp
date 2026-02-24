import { Table, Column, Model, DataType, Default, Index } from 'sequelize-typescript';

@Table({ tableName: 'admins', schema: 'root', timestamps: true, underscored: true, paranoid: true })
export class Admin extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Index
    @Column({ type: DataType.TEXT, unique: true, allowNull: false })
    email!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    password_hash!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Index
    @Default('super_admin')
    @Column({ type: DataType.TEXT })
    role!: string; // super_admin, support, sales, etc.

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Column({ type: DataType.DATE })
    valid_at!: Date | null; // When access starts

    @Index
    @Column({ type: DataType.DATE })
    valid_until!: Date | null; // When access expires

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_main!: boolean; // Primary super admin

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_two_factor_enabled!: boolean;

    @Column(DataType.TEXT)
    two_factor_secret!: string | null;

    // ── TASK-E1.1: MFA hardening ──────────────────────────────────────────────
    @Default(false)
    @Column(DataType.BOOLEAN)
    mfa_enabled!: boolean;

    @Column({ type: DataType.TEXT, allowNull: true })
    mfa_secret?: string;

    @Column({ type: DataType.JSONB, allowNull: true })
    mfa_backup_codes?: string[];

    @Column({ type: DataType.DATE, allowNull: true })
    mfa_verified_at?: Date;

    // ── TASK-E1.1: IP allowlist (root admin hardening) ────────────────────────
    @Column({ type: DataType.JSONB, allowNull: true })
    ip_allowlist?: string[];

    // ── TASK-E1.1: Session duration (root = 8h max) ───────────────────────────
    @Default(8)
    @Column({ type: DataType.INTEGER, allowNull: false })
    session_duration_hours!: number;

    @Default({})
    @Column(DataType.JSONB)
    permissions!: any;

    // Scoped access to specific institutions (empty = all access)
    @Default([])
    @Column(DataType.JSONB)
    allowed_institution_ids!: string[];

    @Column(DataType.TEXT)
    timezone?: string;

    @Column({ type: DataType.DATE })
    last_login_at!: Date;

    @Column(DataType.UUID)
    created_by?: string;
}

export default Admin;
