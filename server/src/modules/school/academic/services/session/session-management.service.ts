import { AcademicSession, AcademicSessionStatus } from '../../../../../database/models/school/academics/session/AcademicSession.model';
import { AcademicTerm, AcademicTermStatus } from '../../../../../database/models/school/academics/session/AcademicTerm.model';
import { StudentEnrollment, StudentEnrollmentStatus } from '../../../../../database/models/school/academics/student/StudentEnrollment.model';
import { Class } from '../../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../../database/models/school/academics/class/Section.model';
import { PromotionHistory, PromotionDecision } from '../../../../../database/models/school/academics/student/PromotionHistory.model';
import { SessionLockLog, LockAction, LockTarget } from '../../../../../database/models/school/academics/session/SessionLockLog.model';
import { Op, Transaction } from 'sequelize';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import { sequelize } from '../../../../../database/sequelize';

export interface LockOptions {
    lockAttendance?: boolean;
    lockMarks?: boolean;
    lockFees?: boolean;
    lockEnrollment?: boolean;
    reason?: string;
}

export interface PromotionResult {
    studentId: string;
    studentName: string;
    fromClass: string;
    toClass: string | null;
    decision: PromotionDecision;
    percentage?: number;
    remarks?: string;
}

export interface SessionTransitionResult {
    totalStudents: number;
    promoted: number;
    detained: number;
    graduated: number;
    errors: string[];
    details: PromotionResult[];
}

/**
 * Service for managing academic session lifecycle, locking, and student promotions
 */
export class SessionManagementService {

    // ==================== LOCKING OPERATIONS ====================

    /**
     * Check if a session is locked (either master lock or specific module lock)
     */
    async isSessionLocked(schemaName: string, sessionId: string, module?: LockTarget): Promise<boolean> {
        const session = await AcademicSession.schema(schemaName).findByPk(sessionId);
        if (!session) return true; // Treat missing session as locked

        // Master lock overrides everything
        if (session.is_locked) return true;

        // Check specific module lock
        if (module) {
            switch (module) {
                case LockTarget.ATTENDANCE:
                    return session.is_attendance_locked;
                case LockTarget.MARKS:
                    return session.is_marks_locked;
                case LockTarget.FEES:
                    return session.is_fees_locked;
                case LockTarget.ENROLLMENT:
                    return session.is_enrollment_locked;
            }
        }

        return false;
    }

    /**
     * Lock an academic session (master lock or granular)
     */
    async lockSession(
        schemaName: string,
        institutionId: string,
        sessionId: string,
        userId: string,
        options: LockOptions = {}
    ): Promise<AcademicSession> {
        const session = await AcademicSession.schema(schemaName).findOne({
            where: { id: sessionId, institution_id: institutionId }
        });

        if (!session) {
            throw new AcademicError('Session not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        const previousState = {
            is_locked: session.is_locked,
            is_attendance_locked: session.is_attendance_locked,
            is_marks_locked: session.is_marks_locked,
            is_fees_locked: session.is_fees_locked,
            is_enrollment_locked: session.is_enrollment_locked
        };

        // Determine if this is a full lock or partial lock
        const isFullLock = Object.keys(options).length === 0 ||
            (options.lockAttendance && options.lockMarks && options.lockFees && options.lockEnrollment);

        await session.update({
            is_locked: isFullLock,
            is_attendance_locked: options.lockAttendance ?? isFullLock,
            is_marks_locked: options.lockMarks ?? isFullLock,
            is_fees_locked: options.lockFees ?? isFullLock,
            is_enrollment_locked: options.lockEnrollment ?? isFullLock,
            locked_at: new Date(),
            locked_by: userId
        });

        // Log the lock action
        await SessionLockLog.schema(schemaName).create({
            institution_id: institutionId,
            session_id: sessionId,
            action: isFullLock ? LockAction.LOCK : LockAction.PARTIAL_LOCK,
            target: LockTarget.SESSION,
            action_at: new Date(),
            performed_by: userId,
            reason: options.reason,
            previous_state: previousState,
            new_state: {
                is_locked: session.is_locked,
                is_attendance_locked: session.is_attendance_locked,
                is_marks_locked: session.is_marks_locked,
                is_fees_locked: session.is_fees_locked,
                is_enrollment_locked: session.is_enrollment_locked
            }
        });

        return session;
    }

    /**
     * Unlock an academic session
     */
    async unlockSession(
        schemaName: string,
        institutionId: string,
        sessionId: string,
        userId: string,
        options: LockOptions = {},
        reason?: string
    ): Promise<AcademicSession> {
        const session = await AcademicSession.schema(schemaName).findOne({
            where: { id: sessionId, institution_id: institutionId }
        });

        if (!session) {
            throw new AcademicError('Session not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        const previousState = {
            is_locked: session.is_locked,
            is_attendance_locked: session.is_attendance_locked,
            is_marks_locked: session.is_marks_locked,
            is_fees_locked: session.is_fees_locked,
            is_enrollment_locked: session.is_enrollment_locked
        };

        // Determine what to unlock
        const isFullUnlock = Object.keys(options).length === 0;

        await session.update({
            is_locked: isFullUnlock ? false : session.is_locked,
            is_attendance_locked: options.lockAttendance !== undefined ? !options.lockAttendance : session.is_attendance_locked,
            is_marks_locked: options.lockMarks !== undefined ? !options.lockMarks : session.is_marks_locked,
            is_fees_locked: options.lockFees !== undefined ? !options.lockFees : session.is_fees_locked,
            is_enrollment_locked: options.lockEnrollment !== undefined ? !options.lockEnrollment : session.is_enrollment_locked,
            locked_at: null,
            locked_by: null
        });

        // Log the unlock action
        await SessionLockLog.schema(schemaName).create({
            institution_id: institutionId,
            session_id: sessionId,
            action: isFullUnlock ? LockAction.UNLOCK : LockAction.PARTIAL_UNLOCK,
            target: LockTarget.SESSION,
            action_at: new Date(),
            performed_by: userId,
            reason,
            previous_state: previousState,
            new_state: {
                is_locked: session.is_locked,
                is_attendance_locked: session.is_attendance_locked,
                is_marks_locked: session.is_marks_locked,
                is_fees_locked: session.is_fees_locked,
                is_enrollment_locked: session.is_enrollment_locked
            }
        });

        return session;
    }

    /**
     * Auto-lock sessions that have passed their end date + auto_lock_days
     * This should be called by a scheduled job
     */
    async autoLockExpiredSessions(schemaName: string, institutionId?: string): Promise<number> {
        const today = new Date();

        const whereClause: {
            is_locked: boolean;
            status: AcademicSessionStatus;
            institution_id?: string;
        } = {
            is_locked: false,
            status: AcademicSessionStatus.COMPLETED
        };

        if (institutionId) {
            whereClause.institution_id = institutionId;
        }

        const sessions = await AcademicSession.schema(schemaName).findAll({ where: whereClause });
        let lockedCount = 0;

        for (const session of sessions) {
            const lockDate = new Date(session.end_date);
            lockDate.setDate(lockDate.getDate() + session.auto_lock_days);

            if (today >= lockDate) {
                await session.update({
                    is_locked: true,
                    is_attendance_locked: true,
                    is_marks_locked: true,
                    is_fees_locked: true,
                    is_enrollment_locked: true,
                    locked_at: new Date()
                });

                // Log auto-lock
                await SessionLockLog.schema(schemaName).create({
                    institution_id: session.institution_id,
                    session_id: session.id,
                    action: LockAction.AUTO_LOCK,
                    target: LockTarget.SESSION,
                    action_at: new Date(),
                    reason: `Auto-locked after ${session.auto_lock_days} days past end date`
                });

                lockedCount++;
            }
        }

        return lockedCount;
    }

    // ==================== SESSION TRANSITION & PROMOTION ====================

    /**
     * Create a new academic session linked to the previous one
     */
    async createNextSession(
        schemaName: string,
        institutionId: string,
        userId: string,
        currentSessionId: string,
        newSessionData: {
            name: string;
            code?: string;
            start_date: Date;
            end_date: Date;
        }
    ): Promise<AcademicSession> {
        const currentSession = await AcademicSession.schema(schemaName).findOne({
            where: { id: currentSessionId, institution_id: institutionId }
        });

        if (!currentSession) {
            throw new AcademicError('Current session not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        // Create new session with link to previous
        const newSession = await AcademicSession.schema(schemaName).create({
            institution_id: institutionId,
            name: newSessionData.name,
            code: newSessionData.code,
            start_date: newSessionData.start_date,
            end_date: newSessionData.end_date,
            status: AcademicSessionStatus.DRAFT,
            previous_session_id: currentSessionId,
            created_by: userId,
            updated_by: userId,
            // Copy configuration from current session
            weekly_off_days: currentSession.weekly_off_days,
            attendance_backdate_days: currentSession.attendance_backdate_days,
            marks_lock_days: currentSession.marks_lock_days,
            promotion_rule: currentSession.promotion_rule,
            settings_config: currentSession.settings_config
        });

        // Update current session to link to new one
        await currentSession.update({ next_session_id: newSession.id });

        return newSession;
    }

    /**
     * Bulk promote students from one session to the next
     * This creates new enrollments based on promotion decisions
     */
    async promoteStudents(
        schemaName: string,
        institutionId: string,
        userId: string,
        fromSessionId: string,
        toSessionId: string,
        promotionDecisions: Array<{
            enrollmentId: string;
            decision: PromotionDecision;
            toClassId?: string;
            toSectionId?: string;
            percentage?: number;
            grade?: string;
            remarks?: string;
        }>
    ): Promise<SessionTransitionResult> {
        const result: SessionTransitionResult = {
            totalStudents: promotionDecisions.length,
            promoted: 0,
            detained: 0,
            graduated: 0,
            errors: [],
            details: []
        };

        // Verify sessions exist and to_session is not locked
        const [fromSession, toSession] = await Promise.all([
            AcademicSession.schema(schemaName).findByPk(fromSessionId),
            AcademicSession.schema(schemaName).findByPk(toSessionId)
        ]);

        if (!fromSession || !toSession) {
            throw new AcademicError('Session not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        if (toSession.is_enrollment_locked) {
            throw new AcademicError(
                'Cannot create enrollments: Target session enrollment is locked',
                ErrorCodes.SESSION_LOCKED,
                400
            );
        }

        const transaction = await sequelize.transaction();

        try {
            for (const decision of promotionDecisions) {
                try {
                    const promotionResult = await this.processPromotion(
                        schemaName,
                        institutionId,
                        userId,
                        decision,
                        fromSessionId,
                        toSessionId,
                        transaction
                    );
                    result.details.push(promotionResult);

                    switch (decision.decision) {
                        case PromotionDecision.PROMOTED:
                            result.promoted++;
                            break;
                        case PromotionDecision.DETAINED:
                            result.detained++;
                            break;
                        case PromotionDecision.COMPLETED:
                            result.graduated++;
                            break;
                    }
                } catch (error) {
                    const errMsg = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push(`Enrollment ${decision.enrollmentId}: ${errMsg}`);
                }
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        return result;
    }

    /**
     * Process a single student promotion
     */
    private async processPromotion(
        schemaName: string,
        institutionId: string,
        userId: string,
        decision: {
            enrollmentId: string;
            decision: PromotionDecision;
            toClassId?: string;
            toSectionId?: string;
            percentage?: number;
            grade?: string;
            remarks?: string;
        },
        fromSessionId: string,
        toSessionId: string,
        transaction: Transaction
    ): Promise<PromotionResult> {
        // Get current enrollment with details
        const currentEnrollment = await StudentEnrollment.schema(schemaName).findByPk(decision.enrollmentId, {
            include: [
                { model: Class.schema(schemaName), as: 'class' },
                { model: Section.schema(schemaName), as: 'section' }
            ],
            transaction
        });

        if (!currentEnrollment) {
            throw new Error('Enrollment not found');
        }

        const currentClass = currentEnrollment.class;
        let newEnrollment: StudentEnrollment | null = null;
        let toClassName: string | null = null;

        // Determine target class based on decision
        if (decision.decision === PromotionDecision.PROMOTED) {
            const targetClassId = decision.toClassId || currentClass.next_class_id;
            if (!targetClassId) {
                throw new Error('No target class specified for promotion');
            }

            const targetClass = await Class.schema(schemaName).findByPk(targetClassId, { transaction });
            if (!targetClass) {
                throw new Error('Target class not found');
            }
            toClassName = targetClass.name;

            // Determine section (use same section name if exists, or first section)
            let targetSectionId = decision.toSectionId;
            if (!targetSectionId) {
                const matchingSection = await Section.schema(schemaName).findOne({
                    where: {
                        class_id: targetClassId,
                        name: currentEnrollment.section?.name,
                        is_active: true
                    },
                    transaction
                });
                targetSectionId = matchingSection?.id;

                // If no matching section, get first active section
                if (!targetSectionId) {
                    const firstSection = await Section.schema(schemaName).findOne({
                        where: { class_id: targetClassId, is_active: true },
                        order: [['name', 'ASC']],
                        transaction
                    });
                    targetSectionId = firstSection?.id;
                }
            }

            if (!targetSectionId) {
                throw new Error('No available section in target class');
            }

            // Create new enrollment
            newEnrollment = await StudentEnrollment.schema(schemaName).create({
                institution_id: institutionId,
                student_id: currentEnrollment.student_id,
                academic_year_id: toSessionId,
                class_id: targetClassId,
                section_id: targetSectionId,
                status: StudentEnrollmentStatus.ACTIVE,
                enrollment_date: new Date(),
                is_repeater: false,
                previous_enrollment_id: currentEnrollment.id,
                promoted_from_class_id: currentEnrollment.class_id,
                admission_type: 'REGULAR'
            }, { transaction });

        } else if (decision.decision === PromotionDecision.DETAINED) {
            // Create enrollment in same class (repeater)
            const targetSectionId = decision.toSectionId || currentEnrollment.section_id;
            toClassName = currentClass.name + ' (Repeater)';

            newEnrollment = await StudentEnrollment.schema(schemaName).create({
                institution_id: institutionId,
                student_id: currentEnrollment.student_id,
                academic_year_id: toSessionId,
                class_id: currentEnrollment.class_id,
                section_id: targetSectionId,
                status: StudentEnrollmentStatus.ACTIVE,
                enrollment_date: new Date(),
                is_repeater: true,
                previous_enrollment_id: currentEnrollment.id,
                promoted_from_class_id: currentEnrollment.class_id,
                admission_type: 'REGULAR'
            }, { transaction });
        }

        // Update current enrollment with promotion details
        await currentEnrollment.update({
            status: decision.decision.toLowerCase(),
            promoted_to_enrollment_id: newEnrollment?.id,
            promotion_date: new Date(),
            final_percentage: decision.percentage,
            final_grade: decision.grade,
            final_result: decision.decision === PromotionDecision.PROMOTED ? 'PASS' :
                decision.decision === PromotionDecision.DETAINED ? 'FAIL' : 'COMPLETED',
            leaving_date: new Date(),
            remarks: decision.remarks
        }, { transaction });

        // Create promotion history record
        await PromotionHistory.schema(schemaName).create({
            institution_id: institutionId,
            student_id: currentEnrollment.student_id,
            from_session_id: fromSessionId,
            from_enrollment_id: currentEnrollment.id,
            from_class_id: currentEnrollment.class_id,
            from_section_id: currentEnrollment.section_id,
            to_session_id: newEnrollment ? toSessionId : undefined,
            to_enrollment_id: newEnrollment?.id,
            to_class_id: newEnrollment?.class_id,
            to_section_id: newEnrollment?.section_id,
            decision: decision.decision,
            decision_date: new Date(),
            final_percentage: decision.percentage,
            final_grade: decision.grade,
            remarks: decision.remarks,
            decided_by: userId,
            is_automatic: false
        }, { transaction });

        return {
            studentId: currentEnrollment.student_id,
            studentName: '', // Would need to join with student/user table
            fromClass: currentClass.name,
            toClass: toClassName,
            decision: decision.decision,
            percentage: decision.percentage,
            remarks: decision.remarks
        };
    }

    // ==================== VALIDATION HELPERS ====================

    /**
     * Validate that an operation can be performed on a session
     */
    async validateSessionOperation(
        schemaName: string,
        sessionId: string,
        operation: LockTarget
    ): Promise<{ valid: boolean; reason?: string }> {
        const isLocked = await this.isSessionLocked(schemaName, sessionId, operation);

        if (isLocked) {
            const session = await AcademicSession.schema(schemaName).findByPk(sessionId);
            return {
                valid: false,
                reason: session?.is_locked
                    ? 'Session is fully locked'
                    : `${operation.toLowerCase()} is locked for this session`
            };
        }

        return { valid: true };
    }

    /**
     * Get lock status summary for a session
     */
    async getSessionLockStatus(schemaName: string, sessionId: string): Promise<{
        isFullyLocked: boolean;
        lockedAt?: Date;
        lockedModules: string[];
    }> {
        const session = await AcademicSession.schema(schemaName).findByPk(sessionId);

        if (!session) {
            throw new AcademicError('Session not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        const lockedModules: string[] = [];
        if (session.is_attendance_locked) lockedModules.push('attendance');
        if (session.is_marks_locked) lockedModules.push('marks');
        if (session.is_fees_locked) lockedModules.push('fees');
        if (session.is_enrollment_locked) lockedModules.push('enrollment');

        return {
            isFullyLocked: session.is_locked,
            lockedAt: session.locked_at,
            lockedModules
        };
    }
}

export const sessionManagementService = new SessionManagementService();
