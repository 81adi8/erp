import { Table, Column, Model, DataType, Default, Index } from 'sequelize-typescript';

@Table({
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
        { fields: ['institution_id', 'created_at'], name: 'idx_audit_logs_institution_created_at' },
        { fields: ['table_name', 'record_id', 'created_at'], name: 'idx_audit_logs_record_created_at' },
        { fields: ['user_id', 'created_at'], name: 'idx_audit_logs_user_created_at' },
        { fields: ['action', 'created_at'], name: 'idx_audit_logs_action_created_at' },
    ],
})
export class AuditLog extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Index
    @Column(DataType.UUID)
    user_id?: string;

    @Index
    @Column(DataType.UUID)
    institution_id?: string;

    @Index
    @Column(DataType.TEXT)
    user_role?: string;

    // RBAC-01 FIX: Added is_super_admin flag to distinguish super-admin actions
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_super_admin!: boolean;

    @Index
    @Column({ type: DataType.TEXT, allowNull: false })
    action!: string; // LOGIN_SUCCESS, etc.

    @Index
    @Column(DataType.TEXT)
    table_name?: string;

    @Index
    @Column(DataType.TEXT)
    record_id?: string;

    @Column(DataType.JSONB)
    before_data?: Record<string, unknown> | null;

    @Column(DataType.JSONB)
    after_data?: Record<string, unknown> | null;

    @Default({})
    @Column(DataType.JSONB)
    meta?: any;

    @Column(DataType.INET)
    ip?: string;

    @Column(DataType.TEXT)
    user_agent?: string;

    // Note: created_at is auto-indexed due to frequent time-range queries
    // Consider partitioning this table by month when it exceeds 10M rows
}

export default AuditLog;
