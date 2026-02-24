// ============================================================================
// ATTENDANCE SETTINGS SERVICE
// Business logic for managing attendance configuration
// ============================================================================

import { Transaction } from 'sequelize';
import { 
    AttendanceSettingsRepository,
    AttendanceAuditRepository,
    createAttendanceRepositories
} from '../repositories/attendance.repository';
import { AttendanceSettings } from '../../../../database/models/school/attendance/AttendanceSettings.model';
import { AttendanceAuditLog } from '../../../../database/models/school/attendance/AttendanceAuditLog.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { 
    CreateAttendanceSettingsDto, 
    UpdateAttendanceSettingsDto 
} from '../dto/attendance.dto';
import { AttendanceError, AttendanceErrorCodes, createAttendanceError } from '../errors/attendance.error';
import { DEFAULT_ATTENDANCE_CONFIG } from '../constants/attendance.constants';
import { AuditAction, AuditEntityType, AttendanceMode, AttendanceScope, AttendanceConfigRules, NotificationChannel } from '../types/attendance.types';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface SettingsResponse {
    id: string;
    scope: AttendanceScope;
    classId: string | null;
    className: string | null;
    mode: AttendanceMode;
    defaultStartTime: string;
    defaultEndTime: string;
    rules: AttendanceConfigRules;
    allowBackdatedMarking: boolean;
    backdatedDaysLimit: number;
    showToParents: boolean;
    showToStudents: boolean;
    autoNotifyParentOnAbsent: boolean;
    notificationChannels: NotificationChannel[];
    workingDaysInWeek: number;
    periodsPerDay: number;
    leaveQuotaPerYear: number;
    isActive: boolean;
}

interface ClassSettingsOverview {
    classId: string;
    className: string;
    hasCustomSettings: boolean;
    mode: AttendanceMode;
    startTime: string;
    endTime: string;
    minimumAttendancePercent: number;
    lateThresholdMinutes: number;
}

// ============================================================================
// SETTINGS SERVICE
// ============================================================================

export class AttendanceSettingsService {
    private schemaName: string;
    private institutionId: string;
    private settingsRepo: AttendanceSettingsRepository;
    private auditRepo: AttendanceAuditRepository;

    constructor(schemaName: string, institutionId: string) {
        this.schemaName = schemaName;
        this.institutionId = institutionId;
        
        const repos = createAttendanceRepositories(schemaName, institutionId);
        this.settingsRepo = repos.settings;
        this.auditRepo = repos.audit;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private mapToResponse(settings: AttendanceSettings): SettingsResponse {
        return {
            id: settings.id,
            scope: settings.scope as AttendanceScope,
            classId: settings.classId || null,
            className: settings.class?.name || null,
            mode: settings.mode as AttendanceMode,
            defaultStartTime: settings.defaultStartTime,
            defaultEndTime: settings.defaultEndTime,
            rules: settings.rules,
            allowBackdatedMarking: settings.allowBackdatedMarking,
            backdatedDaysLimit: settings.backdatedDaysLimit,
            showToParents: settings.showToParents,
            showToStudents: settings.showToStudents,
            autoNotifyParentOnAbsent: settings.autoNotifyParentOnAbsent,
            notificationChannels: settings.notificationChannels as NotificationChannel[],
            workingDaysInWeek: settings.workingDaysInWeek,
            periodsPerDay: settings.periodsPerDay,
            leaveQuotaPerYear: settings.leaveQuotaPerYear,
            isActive: settings.isActive
        };
    }

    private mergeRules(
        existing: AttendanceConfigRules,
        updates?: Partial<AttendanceConfigRules>
    ): AttendanceConfigRules {
        if (!updates) return existing;
        return {
            lateThresholdMinutes: updates.lateThresholdMinutes ?? existing.lateThresholdMinutes,
            halfDayThresholdMinutes: updates.halfDayThresholdMinutes ?? existing.halfDayThresholdMinutes,
            absentThresholdMinutes: updates.absentThresholdMinutes ?? existing.absentThresholdMinutes,
            lockAfterHours: updates.lockAfterHours ?? existing.lockAfterHours,
            editWindowHours: updates.editWindowHours ?? existing.editWindowHours,
            requireApprovalForEdit: updates.requireApprovalForEdit ?? existing.requireApprovalForEdit,
            requireReasonForAbsent: updates.requireReasonForAbsent ?? existing.requireReasonForAbsent,
            autoMarkLeaveAsExcused: updates.autoMarkLeaveAsExcused ?? existing.autoMarkLeaveAsExcused,
            minimumAttendancePercent: updates.minimumAttendancePercent ?? existing.minimumAttendancePercent
        };
    }

    // =========================================================================
    // CORE OPERATIONS
    // =========================================================================

    /**
     * Get effective settings for a scope/class (with inheritance)
     */
    async getEffectiveSettings(
        scope: AttendanceScope,
        classId?: string
    ): Promise<SettingsResponse> {
        const settings = await this.settingsRepo.getSettings(scope, classId);

        if (settings) {
            return this.mapToResponse(settings);
        }

        // Return default configuration
        return {
            id: 'default',
            scope,
            classId: classId || null,
            className: null,
            mode: DEFAULT_ATTENDANCE_CONFIG.mode,
            defaultStartTime: DEFAULT_ATTENDANCE_CONFIG.defaultStartTime,
            defaultEndTime: DEFAULT_ATTENDANCE_CONFIG.defaultEndTime,
            rules: DEFAULT_ATTENDANCE_CONFIG.rules,
            allowBackdatedMarking: DEFAULT_ATTENDANCE_CONFIG.allowBackdatedMarking,
            backdatedDaysLimit: DEFAULT_ATTENDANCE_CONFIG.backdatedDaysLimit,
            showToParents: DEFAULT_ATTENDANCE_CONFIG.showToParents,
            showToStudents: DEFAULT_ATTENDANCE_CONFIG.showToStudents,
            autoNotifyParentOnAbsent: DEFAULT_ATTENDANCE_CONFIG.autoNotifyParentOnAbsent,
            notificationChannels: DEFAULT_ATTENDANCE_CONFIG.notificationChannels,
            workingDaysInWeek: DEFAULT_ATTENDANCE_CONFIG.workingDaysInWeek,
            periodsPerDay: 8,
            leaveQuotaPerYear: 12,
            isActive: DEFAULT_ATTENDANCE_CONFIG.isActive
        };
    }

    /**
     * Get all settings for institution
     */
    async getAllSettings(scope?: AttendanceScope): Promise<SettingsResponse[]> {
        const settings = await this.settingsRepo.getAll(scope);
        return settings.map(s => this.mapToResponse(s));
    }

    /**
     * Get class-wise settings overview
     */
    async getClassSettingsOverview(): Promise<ClassSettingsOverview[]> {
        // Get all classes
        const classes = await Class.schema(this.schemaName).findAll({
            where: { institution_id: this.institutionId },
            order: [['display_order', 'ASC']]
        });

        // Get global student settings as base
        const globalSettings = await this.settingsRepo.getSettings(AttendanceScope.STUDENT);
        const baseRules = globalSettings?.rules || DEFAULT_ATTENDANCE_CONFIG.rules;

        // Get all class-specific settings
        const classSettings = await this.settingsRepo.getAll(AttendanceScope.STUDENT);
        const classSettingsMap = new Map<string, AttendanceSettings>();
        for (const setting of classSettings) {
            if (setting.classId) {
                classSettingsMap.set(setting.classId, setting);
            }
        }

        // Build overview
        return classes.map((cls: Class) => {
            const classSetting = classSettingsMap.get(cls.id);
            const hasCustomSettings = !!classSetting;
            
            return {
                classId: cls.id,
                className: cls.name,
                hasCustomSettings,
                mode: (classSetting?.mode || globalSettings?.mode || DEFAULT_ATTENDANCE_CONFIG.mode) as AttendanceMode,
                startTime: classSetting?.defaultStartTime || globalSettings?.defaultStartTime || DEFAULT_ATTENDANCE_CONFIG.defaultStartTime,
                endTime: classSetting?.defaultEndTime || globalSettings?.defaultEndTime || DEFAULT_ATTENDANCE_CONFIG.defaultEndTime,
                minimumAttendancePercent: classSetting?.rules?.minimumAttendancePercent || baseRules.minimumAttendancePercent,
                lateThresholdMinutes: classSetting?.rules?.lateThresholdMinutes || baseRules.lateThresholdMinutes
            };
        });
    }

    /**
     * Create or update settings
     */
    async saveSettings(
        dto: CreateAttendanceSettingsDto,
        userId: string
    ): Promise<SettingsResponse> {
        // Check if settings already exist
        const existing = await this.settingsRepo.getSettings(dto.scope, dto.classId);
        const isUpdate = !!existing;

        // Merge rules with defaults or existing
        const baseRules = existing?.rules || DEFAULT_ATTENDANCE_CONFIG.rules;
        const mergedRules = this.mergeRules(baseRules, dto.rules);

        // Build settings data
        const settingsData: Partial<AttendanceSettings> = {
            scope: dto.scope,
            classId: dto.classId,
            mode: dto.mode || existing?.mode || DEFAULT_ATTENDANCE_CONFIG.mode,
            defaultStartTime: dto.defaultStartTime || existing?.defaultStartTime || DEFAULT_ATTENDANCE_CONFIG.defaultStartTime,
            defaultEndTime: dto.defaultEndTime || existing?.defaultEndTime || DEFAULT_ATTENDANCE_CONFIG.defaultEndTime,
            rules: mergedRules,
            allowBackdatedMarking: dto.allowBackdatedMarking ?? existing?.allowBackdatedMarking ?? DEFAULT_ATTENDANCE_CONFIG.allowBackdatedMarking,
            backdatedDaysLimit: dto.backdatedDaysLimit ?? existing?.backdatedDaysLimit ?? DEFAULT_ATTENDANCE_CONFIG.backdatedDaysLimit,
            showToParents: dto.showToParents ?? existing?.showToParents ?? DEFAULT_ATTENDANCE_CONFIG.showToParents,
            showToStudents: dto.showToStudents ?? existing?.showToStudents ?? DEFAULT_ATTENDANCE_CONFIG.showToStudents,
            autoNotifyParentOnAbsent: dto.autoNotifyParentOnAbsent ?? existing?.autoNotifyParentOnAbsent ?? DEFAULT_ATTENDANCE_CONFIG.autoNotifyParentOnAbsent,
            notificationChannels: dto.notificationChannels || existing?.notificationChannels || DEFAULT_ATTENDANCE_CONFIG.notificationChannels,
            workingDaysInWeek: dto.workingDaysInWeek ?? existing?.workingDaysInWeek ?? DEFAULT_ATTENDANCE_CONFIG.workingDaysInWeek,
            leaveQuotaPerYear: dto.leaveQuotaPerYear ?? existing?.leaveQuotaPerYear ?? 12,
            isActive: dto.isActive ?? existing?.isActive ?? true
        };

        if (existing) {
            settingsData.id = existing.id;
        }

        const [settings, created] = await this.settingsRepo.upsert(settingsData);

        // Log audit
        await this.auditRepo.log({
            entityType: AuditEntityType.ATTENDANCE_SETTINGS,
            entityId: settings.id,
            action: isUpdate ? AuditAction.UPDATE : AuditAction.CREATE,
            previousValues: isUpdate ? (this.mapToResponse(existing!) as unknown as Record<string, unknown>) : undefined,
            newValues: this.mapToResponse(settings) as unknown as Record<string, unknown>,
            changedById: userId
        });

        // Reload with class info
        const savedSettings = await this.settingsRepo.getSettings(dto.scope, dto.classId);
        return this.mapToResponse(savedSettings!);
    }

    /**
     * Update specific class settings
     */
    async updateClassSettings(
        classId: string,
        dto: UpdateAttendanceSettingsDto,
        userId: string
    ): Promise<SettingsResponse> {
        return this.saveSettings(
            {
                ...dto,
                scope: AttendanceScope.STUDENT,
                classId
            },
            userId
        );
    }

    /**
     * Reset class settings to global defaults
     */
    async resetClassSettings(
        classId: string,
        userId: string
    ): Promise<{ success: boolean }> {
        const existing = await this.settingsRepo.getSettings(AttendanceScope.STUDENT, classId);
        
        if (!existing) {
            return { success: true }; // Nothing to reset
        }

        // Soft delete by setting inactive
        await this.settingsRepo.upsert({
            id: existing.id,
            scope: AttendanceScope.STUDENT,
            classId: classId,
            isActive: false
        });

        // Log audit
        await this.auditRepo.log({
            entityType: AuditEntityType.ATTENDANCE_SETTINGS,
            entityId: existing.id,
            action: AuditAction.DELETE,
            previousValues: this.mapToResponse(existing) as unknown as Record<string, unknown>,
            changedById: userId,
            reason: 'Reset to global defaults'
        });

        return { success: true };
    }

    /**
     * Initialize default settings for institution
     */
    async initializeDefaults(userId: string): Promise<void> {
        const scopes = [AttendanceScope.STUDENT, AttendanceScope.TEACHER, AttendanceScope.STAFF];

        for (const scope of scopes) {
            const existing = await this.settingsRepo.getSettings(scope);
            if (!existing) {
                await this.saveSettings(
                    {
                        scope,
                        mode: DEFAULT_ATTENDANCE_CONFIG.mode,
                        rules: DEFAULT_ATTENDANCE_CONFIG.rules
                    },
                    userId
                );
            }
        }
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createAttendanceSettingsService(
    schemaName: string,
    institutionId: string
): AttendanceSettingsService {
    return new AttendanceSettingsService(schemaName, institutionId);
}

