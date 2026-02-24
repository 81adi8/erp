import { Transaction } from 'sequelize';
import { Model } from 'sequelize-typescript';
import { AuditLog } from '../../database/models/shared/core/AuditLog.model';
import { Student } from '../../database/models/school/academics/student/Student.model';
import { User } from '../../database/models/shared/core/User.model';
import { Mark } from '../../database/models/school/examination/Mark.model';
import { Grade } from '../../database/models/school/examination/Grade.model';
import { FeeCategory } from '../../database/models/school/fees/FeeCategory.model';
import { FeeStructure } from '../../database/models/school/fees/FeeStructure.model';
import { FeeDiscount } from '../../database/models/school/fees/FeeDiscount.model';
import { FeePayment } from '../../database/models/school/fees/FeePayment.model';
import { StudentFeeAssignment } from '../../database/models/school/fees/StudentFeeAssignment.model';
import { getActor, getTenant } from '../context/requestContext';
import { validateSchemaName } from '../database/schema-name.util';
import { logger } from '../utils/logger';

type DataAction = 'CREATE' | 'UPDATE' | 'DELETE';

interface AuditHookOptions {
    schema?: string;
    searchPath?: string;
    transaction?: Transaction;
}

const HOOK_NAME_PREFIX = 'data_change_audit';
const REDACTED = '[REDACTED]';
const SKIP_FIELDS = new Set([
    'created_at',
    'updated_at',
    'deleted_at',
    'createdAt',
    'updatedAt',
    'deletedAt',
]);

const modelsToAudit: Array<any> = [
    Student,
    User,
    Mark,
    Grade,
    FeeCategory,
    FeeStructure,
    FeeDiscount,
    FeePayment,
    StudentFeeAssignment,
] as const;

let hooksRegistered = false;

const toPlain = (instance: Model): Record<string, unknown> => {
    return (instance as any).get?.({ plain: true }) || {};
};

const isSensitiveKey = (key: string): boolean => {
    const normalized = key.toLowerCase();
    return (
        normalized.includes('password') ||
        normalized.includes('secret') ||
        normalized.includes('token') ||
        normalized.includes('hash') ||
        normalized.includes('backup_code')
    );
};

const redactValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map((item) => redactValue(item));
    }

    if (value && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
            result[key] = isSensitiveKey(key) ? REDACTED : redactValue(nested);
        }
        return result;
    }

    return value;
};

const normalizeJson = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }

    try {
        const serialized = JSON.stringify(value, (_key, v) => {
            if (v instanceof Date) return v.toISOString();
            if (typeof v === 'bigint') return v.toString();
            return v;
        });
        return JSON.parse(serialized) as Record<string, unknown>;
    } catch {
        return null;
    }
};

const pickKeys = (
    source: Record<string, unknown>,
    keys: string[]
): Record<string, unknown> => {
    return keys.reduce((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            acc[key] = source[key];
        }
        return acc;
    }, {} as Record<string, unknown>);
};

const safeSchemaName = (value?: string | null): string | null => {
    if (!value) return null;

    try {
        return validateSchemaName(value);
    } catch {
        return null;
    }
};

const resolveSchemaName = (instance: Model, options?: AuditHookOptions): string | null => {
    if (typeof options?.schema === 'string') {
        const validated = safeSchemaName(options.schema);
        if (validated) return validated;
    }

    if (typeof options?.searchPath === 'string') {
        const raw = options.searchPath.split(',')[0]?.replace(/"/g, '').trim();
        const validated = safeSchemaName(raw);
        if (validated) return validated;
    }

    const tableName = (instance.constructor as any).getTableName?.();
    if (tableName && typeof tableName === 'object' && typeof tableName.schema === 'string') {
        const validated = safeSchemaName(tableName.schema);
        if (validated) return validated;
    }

    const tenantSchema = getTenant()?.db_schema;
    return safeSchemaName(tenantSchema);
};

const resolveTableName = (instance: Model): string => {
    const tableName = (instance.constructor as any).getTableName?.();

    if (typeof tableName === 'string') return tableName;
    if (tableName && typeof tableName === 'object' && typeof tableName.tableName === 'string') {
        return tableName.tableName;
    }

    return ((instance.constructor as any).name || 'unknown').toLowerCase();
};

const resolveInstitutionId = (instance: Model): string | undefined => {
    const plain = toPlain(instance);
    const institutionId = (plain.institution_id || (plain as any).institutionId) as string | undefined;
    if (institutionId) return institutionId;
    return getTenant()?.id;
};

const resolveRecordId = (instance: Model): string => {
    const plain = toPlain(instance);
    const candidate = plain.id ?? (plain as any).record_id;
    return candidate ? String(candidate) : 'unknown';
};

const resolveActor = (): { userId?: string; role?: string } => {
    const actor = getActor();
    return {
        userId: actor?.userId,
        role: actor?.roles?.[0],
    };
};

const logDataChange = async (
    instance: Model,
    action: DataAction,
    options: AuditHookOptions,
    beforeData: Record<string, unknown> | null,
    afterData: Record<string, unknown> | null,
    changedFields: string[] = []
): Promise<void> => {
    try {
        const schemaName = resolveSchemaName(instance, options);
        const tableName = resolveTableName(instance);
        const recordId = resolveRecordId(instance);
        const institutionId = resolveInstitutionId(instance);
        const actor = resolveActor();

        const payload = {
            user_id: actor.userId,
            user_role: actor.role,
            institution_id: institutionId,
            action,
            table_name: tableName,
            record_id: recordId,
            before_data: beforeData,
            after_data: afterData,
            meta: {
                source: 'sequelize_hook',
                changed_fields: changedFields,
            },
        };

        const scopedModel = schemaName ? AuditLog.schema(schemaName) : AuditLog;
        await scopedModel.create(payload as any, {
            transaction: options.transaction,
            hooks: false,
        } as any);
    } catch (error) {
        logger.error('[DataChangeAudit] Failed to persist audit log:', error);
    }
};

const onAfterCreate = async (instance: Model, options: AuditHookOptions): Promise<void> => {
    const after = normalizeJson(redactValue(toPlain(instance)));
    await logDataChange(instance, 'CREATE', options, null, after, []);
};

const onAfterUpdate = async (instance: Model, options: AuditHookOptions): Promise<void> => {
    const changed = instance.changed();
    const changedFields = (Array.isArray(changed) ? changed : [])
        .filter((field) => !SKIP_FIELDS.has(field));

    if (changedFields.length === 0) return;

    const previousData = ((instance as any)._previousDataValues || {}) as Record<string, unknown>;
    const currentData = toPlain(instance);

    const before = normalizeJson(redactValue(pickKeys(previousData, changedFields)));
    const after = normalizeJson(redactValue(pickKeys(currentData, changedFields)));

    await logDataChange(instance, 'UPDATE', options, before, after, changedFields);
};

const onAfterDestroy = async (instance: Model, options: AuditHookOptions): Promise<void> => {
    const before = normalizeJson(redactValue(toPlain(instance)));
    await logDataChange(instance, 'DELETE', options, before, null, []);
};

export const registerDataChangeAuditHooks = (): void => {
    if (hooksRegistered) return;
    hooksRegistered = true;

    for (const model of modelsToAudit) {
        (model as any).addHook('afterCreate', `${HOOK_NAME_PREFIX}_create`, onAfterCreate as any);
        (model as any).addHook('afterUpdate', `${HOOK_NAME_PREFIX}_update`, onAfterUpdate as any);
        (model as any).addHook('afterDestroy', `${HOOK_NAME_PREFIX}_destroy`, onAfterDestroy as any);
    }

    logger.info('[DataChangeAudit] Sequelize hooks registered for students, users, fees, and grades');
};
