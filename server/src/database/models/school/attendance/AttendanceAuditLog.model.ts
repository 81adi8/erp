// ============================================================================
// ATTENDANCE AUDIT LOG MODEL
// Track all attendance modifications for compliance and debugging
// ============================================================================

import { 
    Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, Index
} from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { User } from '../../shared/core/User.model';

import { AuditAction, AuditEntityType } from '../../../../modules/school/attendance/types/attendance.types';

@Table({ 
    tableName: 'attendance_audit_logs', 
    timestamps: true, 
    underscored: true,
    indexes: [
        { fields: ['institution_id', 'entity_type', 'entity_id'] },
        { fields: ['institution_id', 'action'] },
        { fields: ['institution_id', 'changed_by_id'] },
        { fields: ['changed_at'] }
    ]
})
export class AttendanceAuditLog extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    // ==================== TENANT ISOLATION ====================
    @ForeignKey(() => Institution)
    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    institutionId!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    // ==================== ENTITY REFERENCE ====================
    @Index
    @Column({
        type: DataType.ENUM(...(Object.values(AuditEntityType) as string[])),
        allowNull: false
    })
    entityType!: AuditEntityType;

    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    entityId!: string;

    // ==================== ACTION DETAILS ====================
    @Index
    @Column({
        type: DataType.ENUM(...(Object.values(AuditAction) as string[])),
        allowNull: false
    })
    action!: AuditAction;

    // Store previous and new values as JSONB for flexibility
    @Column({ type: DataType.JSONB, allowNull: true })
    previousValues?: Record<string, unknown>;

    @Column({ type: DataType.JSONB, allowNull: true })
    newValues?: Record<string, unknown>;

    // Human-readable description of change
    @Column({ type: DataType.TEXT, allowNull: true })
    changeDescription?: string;

    // Reason provided by user for the change
    @Column({ type: DataType.TEXT, allowNull: true })
    reason?: string;

    // ==================== CHANGE METADATA ====================
    @ForeignKey(() => User)
    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    changedById!: string;

    @BelongsTo(() => User)
    changedBy!: User;

    @Index
    @Default(DataType.NOW)
    @Column({ type: DataType.DATE, allowNull: false })
    changedAt!: Date;

    @Column({ type: DataType.STRING(45), allowNull: true })
    ipAddress?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    userAgent?: string;

    // ==================== SESSION INFO (for context) ====================
    @Column({ type: DataType.UUID, allowNull: true })
    sessionId?: string;

    // ==================== STATIC METHODS ====================

    /**
     * Log an attendance change
     */
    static async logChange(
        schemaName: string,
        data: {
            institutionId: string;
            entityType: AuditEntityType;
            entityId: string;
            action: AuditAction;
            previousValues?: Record<string, unknown>;
            newValues?: Record<string, unknown>;
            changedById: string;
            reason?: string;
            ipAddress?: string;
            userAgent?: string;
        }
    ): Promise<AttendanceAuditLog> {
        // Generate change description
        let changeDescription = `${data.action} on ${data.entityType}`;
        
        if (data.action === AuditAction.UPDATE && data.previousValues && data.newValues) {
            const changes: string[] = [];
            for (const key of Object.keys(data.newValues)) {
                if (data.previousValues[key] !== data.newValues[key]) {
                    changes.push(`${key}: ${data.previousValues[key]} → ${data.newValues[key]}`);
                }
            }
            if (changes.length > 0) {
                changeDescription = changes.join(', ');
            }
        }

        return AttendanceAuditLog.schema(schemaName).create({
            institutionId: data.institutionId,
            entityType: data.entityType,
            entityId: data.entityId,
            action: data.action,
            previousValues: data.previousValues,
            newValues: data.newValues,
            changeDescription: changeDescription,
            reason: data.reason,
            changedById: data.changedById,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            changedAt: new Date()
        });
    }

    /**
     * Get audit history for an entity
     */
    static async getHistory(
        schemaName: string,
        institutionId: string,
        entityType: AuditEntityType,
        entityId: string,
        limit: number = 50
    ): Promise<AttendanceAuditLog[]> {
        return AttendanceAuditLog.schema(schemaName).findAll({
            where: {
                institutionId: institutionId,
                entityType: entityType,
                entityId: entityId
            },
            include: [{
                model: User.schema(schemaName),
                as: 'changedBy',
                attributes: ['id', 'first_name', 'last_name', 'email']
            }],
            order: [['changedAt', 'DESC']],
            limit
        });
    }
}

export default AttendanceAuditLog;
