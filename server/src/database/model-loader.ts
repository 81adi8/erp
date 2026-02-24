import fs from 'fs';
import path from 'path';
import { Model } from 'sequelize-typescript';
import { logger } from '../core/utils/logger';

/**
 * Utility for discovering and sorting Sequelize models for multi-tenant isolation
 */
export class ModelLoader {
    static getModelsFromDir(dirPath: string): any[] {
        const modelsMap = new Map<string, any>();

        const findModels = (dir: string) => {
            if (!fs.existsSync(dir)) return;

            const items = fs.readdirSync(dir);
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);

                if (stat.isDirectory()) {
                    findModels(itemPath);
                } else if (item.endsWith('.model.ts') || item.endsWith('.model.js')) {
                    try {
                        const modelExports = require(itemPath);
                        Object.values(modelExports).forEach((exported: any) => {
                            // Check if it's a Sequelize model class
                            if (typeof exported === 'function' && exported.prototype instanceof Model) {
                                // Use the model name as key for deduplication
                                modelsMap.set(exported.name, exported);
                            }
                        });
                    } catch (err) {
                        logger.warn(`[ModelLoader] Failed to load model from ${itemPath}:`, err);
                    }
                }
            }
        };

        findModels(dirPath);
        return Array.from(modelsMap.values());
    }

    /**
     * Sort models based on dependency order to ensure safe sync/migration
     */
    static sortModels(models: any[]): any[] {
        const modelOrder = [
            // Public models (dependency order)
            'Module', 'Feature', 'Permission', 'Plan', 'PlanPermission', 'PlanModule', 
            'Institution', 'RoleTemplate', 'AccessBundle', 'FeatureFlag', 'TenantMetrics', 'GlobalHoliday',

            // Root models
            'Admin', 'AdminSession', 'AdminRefreshToken',

            // Shared core models (dependency order)
            'Role', 'User', 'UserRole', 'RolePermission',
            'Session', 'RefreshToken', 'AuditLog', 'FailedLogin',

            // School models - base entities first
            'AcademicSession', 'AcademicYear', 'AcademicTerm', 'SessionHoliday', 'MasterHoliday', 'Class', 'Subject',
            'Teacher', 'Student', 'Section', 'StudentEnrollment', 'ClassSubject',
            'ClassTeacherAssignment', 'SubjectTeacherAssignment',
            'StudentDocument', 'ParentProfile', 'StudentParentLink',
            'Chapter', 'Topic', 'LessonPlan', 'Period', 'Timetable', 'TimetableSlot', 'TimetableTemplate', 'Parent',
            'StudentParent', 'Exam', 'ExamSchedule', 'Mark', 'Grade', 'SchoolModel',
            'StudentAttendance',

            // School fee models (dependency order)
            'FeeCategory', 'FeeStructure', 'FeeDiscount', 'StudentFeeAssignment', 'FeePayment',

            // Communication models
            'Notice', 'Notification', 'NotificationTemplate', 'ParentPortalAccess',

            // Permission/Config models
            'AdminPermission', 'UserPermission', 'TenantRoleConfig',

            // University models
            'Department', 'Faculty', 'Program', 'Course', 'Semester', 'Enrollment', 'GradeSheet',
        ];

        return models.sort((a, b) => {
            const indexA = modelOrder.indexOf(a.name);
            const indexB = modelOrder.indexOf(b.name);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.name.localeCompare(b.name);
        });
    }
}
