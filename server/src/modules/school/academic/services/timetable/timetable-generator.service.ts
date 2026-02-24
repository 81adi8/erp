import { TimetableSlot, TimetableSlotType } from '../../../../../database/models/school/academics/timetable/TimetableSlot.model';
import { TimetableTemplate } from '../../../../../database/models/school/academics/timetable/TimetableTemplate.model';
import { ClassSubject, SchedulingPreferences } from '../../../../../database/models/school/academics/curriculum/ClassSubject.model';
import { Section } from '../../../../../database/models/school/academics/class/Section.model';
import { Class } from '../../../../../database/models/school/academics/class/Class.model';
import { Subject } from '../../../../../database/models/school/academics/curriculum/Subject.model';
import { Teacher } from '../../../../../database/models/school/academics/staff/Teacher.model';
import { AcademicSession, AcademicSessionStatus } from '../../../../../database/models/school/academics/session/AcademicSession.model';
import { academicCalendarService, DayStatus } from '../calendar/academic-calendar.service';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import { sequelize } from '../../../../../database/sequelize';
import { Op } from 'sequelize';
import { GenerateTimetableDto, GenerationResult } from '../../dto/timetable-generation.dto';
import { logger } from '../../../../../core/utils/logger';

/**
 * Internal representation of a subject to be scheduled
 */
interface SubjectToSchedule {
    id: string;
    subject_id: string;
    teacher_id: string | null;
    periods_per_week: number;
    subject_name: string;
    max_periods_per_day: number;
    scheduling_preferences: SchedulingPreferences;
    requires_special_room: boolean;
    special_room_type: string | null;
}

interface GeneratedSlot {
    institution_id: string;
    class_id: string;
    section_id: string;
    session_id: string;
    subject_id?: string | null;
    teacher_id?: string | null;
    day_of_week: number;
    slot_number: number;
    slot_type: TimetableSlotType | string;
    start_time: string;
    end_time: string;
    is_active: boolean;
}

/**
 * Constraint relaxation levels (from strict to lenient)
 */
enum RelaxationLevel {
    STRICT = 0,           // Respect all preferences
    RELAX_PREFERENCES = 1, // Ignore preferred days/slots
    RELAX_AVOID = 2,      // Ignore avoid days/slots  
    RELAX_MAX_PER_DAY = 3, // Allow exceeding max per day by 1
    EMERGENCY = 4          // Place anywhere possible
}

export class TimetableGeneratorService {
    /**
     * Automatically generates a conflict-free timetable for a section
     * Uses intelligent scheduling with progressive constraint relaxation
     */
    async generate(schemaName: string, institutionId: string, data: GenerateTimetableDto): Promise<GenerationResult> {
        try {
            // ============================================
            // PHASE 1: FETCH AND VALIDATE PREREQUISITES
            // ============================================
            if (!data.section_id) throw new AcademicError('Section ID is required', ErrorCodes.VALIDATION_ERROR, 400);
            if (!data.session_id) throw new AcademicError('Session ID is required', ErrorCodes.VALIDATION_ERROR, 400);

            const section = await Section.schema(schemaName).findOne({
                where: { id: data.section_id, institution_id: institutionId },
                include: [{ model: Class.schema(schemaName), as: 'class' }]
            });

            if (!section) throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);

            const session = await AcademicSession.schema(schemaName).findOne({
                where: { id: data.session_id, institution_id: institutionId }
            });

            if (!session) throw new AcademicError('Academic session not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);

            // Academic Calendar Validation
            if (session.is_locked) {
                throw new AcademicError('The academic session is locked. Timetable cannot be modified.', ErrorCodes.VALIDATION_ERROR, 403);
            }

            if (session.status === AcademicSessionStatus.COMPLETED || session.status === AcademicSessionStatus.ARCHIVED) {
                throw new AcademicError('Cannot generate timetable for a completed or archived session.', ErrorCodes.VALIDATION_ERROR, 403);
            }

            const template = await this.getTemplate(schemaName, institutionId, data.template_id);
            if (!template) throw new AcademicError('No active timetable template found. Please create a template first.', ErrorCodes.TIMETABLE_NOT_FOUND, 404);

            // ============================================
            // PHASE 2: FETCH SUBJECT REQUIREMENTS
            // ============================================
            const subjectRequirements = await ClassSubject.schema(schemaName).findAll({
                where: {
                    institution_id: institutionId,
                    academic_year_id: data.session_id,
                    [Op.or]: [
                        { section_id: data.section_id },
                        { class_id: section.class_id, section_id: null }
                    ],
                    is_active: true
                },
                include: [{ model: Subject.schema(schemaName), as: 'subject' }]
            });

            logger.info(`[Generator] Found ${subjectRequirements.length} subject requirements`);

            if (subjectRequirements.length === 0) {
                throw new AcademicError('No subjects configured for this section/class', ErrorCodes.SUBJECT_NOT_FOUND, 400);
            }

            // Deduplicate (section mapping overrides class mapping)
            const requirementsMap = new Map<string, ClassSubject>();
            subjectRequirements.forEach(req => {
                if (req.section_id || !requirementsMap.has(req.subject_id)) {
                    requirementsMap.set(req.subject_id, req);
                }
            });

            // ============================================
            // PHASE 1.1: ANALYZE ACADEMIC CALENDAR RELIABILITY
            // ============================================
            const calendar = await academicCalendarService.getCalendarRange(
                schemaName,
                institutionId,
                session.start_date,
                session.end_date,
                session.id
            );

            const dayInstructionalCounts = new Map<number, number>();
            if (calendar) {
                Object.values(calendar).forEach(day => {
                    if (day.status === DayStatus.WORKING) {
                        const d = new Date(day.date).getDay();
                        dayInstructionalCounts.set(d, (dayInstructionalCounts.get(d) || 0) + 1);
                    }
                });
            }

            // Calculate reliability scores (0.5 to 1.0)
            const maxWorkingDays = Math.max(...Array.from(dayInstructionalCounts.values()), 1);
            const dayReliability = new Map<number, number>();
            for (let i = 0; i <= 6; i++) {
                const count = dayInstructionalCounts.get(i) || 0;
                dayReliability.set(i, 0.5 + (count / maxWorkingDays) * 0.5);
            }

            const warnings: string[] = [];
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            dayInstructionalCounts.forEach((count, day) => {
                if (count < maxWorkingDays * 0.8 && !session.weekly_off_days.includes(day)) {
                    warnings.push(`${dayNames[day]} has significantly fewer instructional days (${count}) due to holidays in this session.`);
                }
            });

            // ============================================
            // PHASE 3: PREPARE SCHEDULING CONFIGURATION
            // ============================================
            const rules = template.generation_rules || {};
            const defaultMaxPerDay = rules.max_periods_per_subject_per_day || 2;
            const maxConsecutiveTeacher = rules.max_consecutive_hours_teacher || 4;
            const maxTeacherLoadPerDay = rules.max_periods_per_teacher_per_day || 6;
            const balanceDistribution = rules.balance_subject_distribution ?? true;

            // Build subjects to schedule with all preferences
            const subjectsToSchedule: SubjectToSchedule[] = Array.from(requirementsMap.values()).map(req => ({
                id: req.id,
                subject_id: req.subject_id,
                teacher_id: req.teacher_id || null,
                periods_per_week: req.periods_per_week,
                subject_name: req.subject?.name || 'Unknown',
                max_periods_per_day: req.max_periods_per_day || defaultMaxPerDay,
                scheduling_preferences: req.scheduling_preferences || {},
                requires_special_room: req.requires_special_room || false,
                special_room_type: req.special_room_type || null
            }));

            // Sort by priority (higher priority first) and then by periods needed (more periods first)
            subjectsToSchedule.sort((a, b) => {
                const priorityA = a.scheduling_preferences.priority || 5;
                const priorityB = b.scheduling_preferences.priority || 5;
                if (priorityB !== priorityA) return priorityB - priorityA;
                return b.periods_per_week - a.periods_per_week;
            });

            // Extract template configuration
            const offDays = session.weekly_off_days || [];
            const workingDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !offDays.includes(d));
            const breakSlots = template.break_slots || [];
            const lunchSlot = template.lunch_slot || 0;
            const slotDuration = template.slot_duration_minutes || 45;
            const totalSlots = template.total_slots_per_day || 8;
            const startTimeConf = template.start_time || '08:00';

            // Validate capacity
            const totalRequiredPeriods = subjectsToSchedule.reduce((sum, sub) => sum + sub.periods_per_week, 0);
            const academicSlotsPerDay = totalSlots - breakSlots.length - (lunchSlot ? 1 : 0);
            const availableAcademicSlots = workingDays.length * academicSlotsPerDay;

            logger.info(`[Generator] Total required: ${totalRequiredPeriods}, Available slots: ${availableAcademicSlots}`);

            if (totalRequiredPeriods > availableAcademicSlots) {
                throw new AcademicError(
                    `Insufficient slots! Required: ${totalRequiredPeriods}, Available: ${availableAcademicSlots}. Consider adding more periods or reducing subject requirements.`,
                    ErrorCodes.TIMETABLE_CONFLICT,
                    400
                );
            }

            // ============================================
            // PHASE 4: FETCH EXISTING CONSTRAINTS (other sections)
            // ============================================
            const busySlots = await TimetableSlot.schema(schemaName).findAll({
                where: {
                    institution_id: institutionId,
                    session_id: data.session_id,
                    is_active: true,
                    section_id: { [Op.ne]: data.section_id }
                },
                transaction: null
            });

            // Build teacher availability map for faster lookups
            const teacherBusyMap = new Map<string, Set<string>>();
            busySlots.forEach(slot => {
                if (slot.teacher_id) {
                    const key = `${slot.teacher_id}-${slot.day_of_week}-${slot.slot_number}`;
                    if (!teacherBusyMap.has(slot.teacher_id)) {
                        teacherBusyMap.set(slot.teacher_id, new Set());
                    }
                    teacherBusyMap.get(slot.teacher_id)!.add(`${slot.day_of_week}-${slot.slot_number}`);
                }
            });

            // ============================================
            // PHASE 5: INTELLIGENT GENERATION ALGORITHM
            // ============================================
            const resultSlots: GeneratedSlot[] = [];
            const remainingPeriods = new Map(subjectsToSchedule.map(s => [s.id, s.periods_per_week]));
            const subjectDayCount = new Map<string, Map<number, number>>();
            const subjectDaySlots = new Map<string, Map<number, number[]>>();
            const teacherDailyLoad = new Map<string, Map<number, number>>();

            // Build all available academic slots
            const allAcademicSlots: Array<{ day: number; slot: number }> = [];
            for (const day of workingDays) {
                for (let slot = 1; slot <= totalSlots; slot++) {
                    if (!breakSlots.includes(slot) && lunchSlot !== slot) {
                        allAcademicSlots.push({ day, slot });
                    }
                }
            }

            // Helper: Check teacher availability (both global and current generation)
            const isTeacherAvailable = (teacherId: string | null, day: number, slotNum: number): boolean => {
                if (!teacherId) return true;

                // Global conflict from other sections
                const busyKey = `${day}-${slotNum}`;
                if (teacherBusyMap.get(teacherId)?.has(busyKey)) {
                    return false;
                }

                // Current generation conflict
                if (resultSlots.some(s => s.teacher_id === teacherId && s.day_of_week === day && s.slot_number === slotNum)) {
                    return false;
                }

                return true;
            };

            // Helper: Check teacher consecutive hours (soft constraint)
            const getTeacherConsecutiveHours = (teacherId: string | null, day: number, slot: number): number => {
                if (!teacherId || maxConsecutiveTeacher <= 0) return 0;

                const teacherSlots = resultSlots
                    .filter(s => s.teacher_id === teacherId && s.day_of_week === day)
                    .map(s => s.slot_number as number)
                    .sort((a, b) => a - b);

                let consecutiveCount = 0;
                // Check backwards
                for (let i = slot - 1; i >= 1; i--) {
                    if (teacherSlots.includes(i)) consecutiveCount++;
                    else break;
                }
                // Check forwards
                for (let i = slot + 1; i <= totalSlots; i++) {
                    if (teacherSlots.includes(i)) consecutiveCount++;
                    else break;
                }

                return consecutiveCount + 1; // Include the current slot
            };

            // Helper: Check if slot is available
            const isSlotAvailable = (day: number, slot: number): boolean => {
                return !resultSlots.some(s => s.day_of_week === day && s.slot_number === slot);
            };

            // Helper: Calculate preference score for a slot
            const calculateSlotScore = (subject: SubjectToSchedule, day: number, slot: number, relaxLevel: RelaxationLevel): number => {
                const reliability = dayReliability.get(day) || 1.0;
                const prefs = subject.scheduling_preferences;
                let score = 100 * reliability; // Base score adjusted by reliability factor

                // Bonus for heavy subjects on reliable days
                if (subject.periods_per_week >= 4) {
                    score += reliability * 150;
                }

                // Fixed slots get highest priority (always respected)
                if (prefs.fixed_slots?.some(fs => fs.day === day && fs.slot === slot)) {
                    return 10000;
                }

                if (relaxLevel === RelaxationLevel.STRICT || relaxLevel === RelaxationLevel.RELAX_AVOID) {
                    // Preferred days bonus
                    if (prefs.preferred_days?.includes(day)) {
                        score += 50;
                    }

                    // Preferred slots handling
                    if (prefs.preferred_slots) {
                        for (const prefSlot of prefs.preferred_slots) {
                            if (typeof prefSlot === 'number' && prefSlot === slot) {
                                score += 40;
                            } else if (prefSlot === 'first' && slot <= 2) {
                                score += 30;
                            } else if (prefSlot === 'last' && slot >= totalSlots - 1) {
                                score += 30;
                            } else if (prefSlot === 'morning' && slot < (lunchSlot || Math.ceil(totalSlots / 2))) {
                                score += 20;
                            } else if (prefSlot === 'afternoon' && slot > (lunchSlot || Math.ceil(totalSlots / 2))) {
                                score += 20;
                            }
                        }
                    }
                }

                if (relaxLevel === RelaxationLevel.STRICT) {
                    // Avoid days penalty (only in strict mode)
                    if (prefs.avoid_days?.includes(day)) {
                        score -= 200;
                    }

                    // Avoid slots penalty
                    if (prefs.avoid_slots?.includes(slot)) {
                        score -= 150;
                    }
                }

                // Spread evenly: penalize if already scheduled on this day
                if (prefs.spread_evenly !== false) { // Default to true
                    const dayCount = subjectDayCount.get(subject.subject_id)?.get(day) || 0;
                    score -= dayCount * 40;
                }

                // Consecutive period preference
                if (prefs.prefer_consecutive) {
                    const existingSlots = subjectDaySlots.get(subject.subject_id)?.get(day) || [];
                    if (existingSlots.includes(slot - 1) || existingSlots.includes(slot + 1)) {
                        score += 60; // Strong bonus for adjacent slots
                    }
                }

                // Teacher consecutive hours soft penalty
                const consecutiveHours = getTeacherConsecutiveHours(subject.teacher_id, day, slot);
                if (consecutiveHours > maxConsecutiveTeacher) {
                    score -= (consecutiveHours - maxConsecutiveTeacher) * 50;
                }

                // Balance across days for teacher
                if (subject.teacher_id) {
                    const teacherDayCount = teacherDailyLoad.get(subject.teacher_id)?.get(day) || 0;
                    score -= teacherDayCount * 15; // Soft penalty to avoid overloading teacher on one day
                }

                return score;
            };

            // Helper: Check if subject can be placed in slot at given relaxation level
            const canPlaceSubject = (
                subject: SubjectToSchedule,
                day: number,
                slot: number,
                relaxLevel: RelaxationLevel
            ): boolean => {
                if (!isSlotAvailable(day, slot)) return false;
                if (!isTeacherAvailable(subject.teacher_id, day, slot)) return false;

                const prefs = subject.scheduling_preferences;
                const currentDayCount = subjectDayCount.get(subject.subject_id)?.get(day) || 0;

                // Max per day constraint
                if (relaxLevel < RelaxationLevel.RELAX_MAX_PER_DAY) {
                    if (currentDayCount >= subject.max_periods_per_day) return false;
                } else if (relaxLevel === RelaxationLevel.RELAX_MAX_PER_DAY) {
                    // Allow exceeding by 1
                    if (currentDayCount >= subject.max_periods_per_day + 1) return false;
                }
                // Emergency mode: no max per day check

                // Avoid days (only strict mode)
                if (relaxLevel === RelaxationLevel.STRICT) {
                    if (prefs.avoid_days?.includes(day)) return false;
                }

                // Teacher total load check (Balanced Check)
                if (subject.teacher_id && relaxLevel < RelaxationLevel.EMERGENCY) {
                    const currentLoad = teacherDailyLoad.get(subject.teacher_id)?.get(day) || 0;
                    if (currentLoad >= maxTeacherLoadPerDay) return false;
                }

                return true;
            };

            // ============================================
            // STEP 1: Handle Fixed Slots First
            // ============================================
            for (const subject of subjectsToSchedule) {
                const prefs = subject.scheduling_preferences;
                if (prefs.fixed_slots && prefs.fixed_slots.length > 0) {
                    for (const fixed of prefs.fixed_slots) {
                        if ((remainingPeriods.get(subject.id) || 0) <= 0) break;
                        if (!workingDays.includes(fixed.day)) continue;
                        if (breakSlots.includes(fixed.slot) || fixed.slot === lunchSlot) continue;
                        if (!isSlotAvailable(fixed.day, fixed.slot)) continue;
                        if (!isTeacherAvailable(subject.teacher_id, fixed.day, fixed.slot)) continue;

                        // Fixed slots override max per day
                        this.assignSlot(
                            resultSlots, subject, fixed.day, fixed.slot,
                            institutionId, section.class_id, data.section_id, data.session_id,
                            startTimeConf, slotDuration,
                            remainingPeriods, subjectDayCount, subjectDaySlots, teacherDailyLoad
                        );
                    }
                }
            }

            // ============================================
            // STEP 2: Progressive Relaxation Scheduling
            // ============================================
            const relaxationLevels = [
                RelaxationLevel.STRICT,
                RelaxationLevel.RELAX_PREFERENCES,
                RelaxationLevel.RELAX_AVOID,
                RelaxationLevel.RELAX_MAX_PER_DAY,
                RelaxationLevel.EMERGENCY
            ];

            for (const relaxLevel of relaxationLevels) {
                let progress = true;

                while (progress) {
                    progress = false;

                    // Find subjects with remaining periods, prioritized
                    const pendingSubjects = subjectsToSchedule
                        .filter(s => (remainingPeriods.get(s.id) || 0) > 0)
                        .sort((a, b) => {
                            // First by priority
                            const priorityA = a.scheduling_preferences.priority || 5;
                            const priorityB = b.scheduling_preferences.priority || 5;
                            if (priorityB !== priorityA) return priorityB - priorityA;
                            // Then by remaining periods (more remaining = higher priority)
                            const remainingA = remainingPeriods.get(a.id) || 0;
                            const remainingB = remainingPeriods.get(b.id) || 0;
                            return remainingB - remainingA;
                        });

                    if (pendingSubjects.length === 0) break;

                    let bestAssignment: { subject: SubjectToSchedule; day: number; slot: number; score: number } | null = null;

                    for (const subject of pendingSubjects) {
                        for (const { day, slot } of allAcademicSlots) {
                            if (!canPlaceSubject(subject, day, slot, relaxLevel)) continue;

                            const score = calculateSlotScore(subject, day, slot, relaxLevel);

                            if (!bestAssignment || score > bestAssignment.score) {
                                bestAssignment = { subject, day, slot, score };
                            }
                        }
                    }

                    if (bestAssignment) {
                        this.assignSlot(
                            resultSlots, bestAssignment.subject, bestAssignment.day, bestAssignment.slot,
                            institutionId, section.class_id, data.section_id, data.session_id,
                            startTimeConf, slotDuration,
                            remainingPeriods, subjectDayCount, subjectDaySlots, teacherDailyLoad
                        );
                        progress = true;
                    }
                }

                // Check if all periods are scheduled
                const allScheduled = subjectsToSchedule.every(s => (remainingPeriods.get(s.id) || 0) <= 0);
                if (allScheduled) {
                    logger.info(`[Generator] All periods scheduled at relaxation level: ${RelaxationLevel[relaxLevel]}`);
                    break;
                }
            }

            // ============================================
            // STEP 3: Fill Break/Lunch Slots
            // ============================================
            for (const day of workingDays) {
                for (let slotNum = 1; slotNum <= totalSlots; slotNum++) {
                    if (breakSlots.includes(slotNum) || lunchSlot === slotNum) {
                        const startTime = this.calculateStartTime(startTimeConf, slotNum, slotDuration);
                        const endTime = this.calculateEndTime(startTime, slotDuration);

                        resultSlots.push({
                            institution_id: institutionId,
                            class_id: section.class_id,
                            section_id: data.section_id,
                            session_id: data.session_id,
                            day_of_week: day,
                            slot_number: slotNum,
                            slot_type: lunchSlot === slotNum ? TimetableSlotType.LUNCH : TimetableSlotType.BREAK,
                            start_time: startTime,
                            end_time: endTime,
                            is_active: true
                        });
                    }
                }
            }

            // ============================================
            // PHASE 6: VALIDATE RESULTS
            // ============================================
            const unmetDetails: string[] = [];
            for (const [id, remaining] of remainingPeriods.entries()) {
                if (remaining > 0) {
                    const subject = subjectsToSchedule.find(s => s.id === id);
                    if (subject) {
                        // Diagnose why it failed
                        let reason = '';
                        
                        // Check if teacher conflicts exist
                        if (subject.teacher_id) {
                            const teacherConflicts = allAcademicSlots.filter(({ day, slot }) => 
                                isSlotAvailable(day, slot) && !isTeacherAvailable(subject.teacher_id, day, slot)
                            ).length;
                            if (teacherConflicts > 0) {
                                reason += `Teacher busy in ${teacherConflicts} slots. `;
                            }
                        }

                        // Check max per day saturation
                        const maxPerDaySaturated = workingDays.every(day => {
                            const count = subjectDayCount.get(subject.subject_id)?.get(day) || 0;
                            return count >= subject.max_periods_per_day;
                        });
                        if (maxPerDaySaturated) {
                            reason += `Max ${subject.max_periods_per_day}/day reached on all days. `;
                        }

                        unmetDetails.push(`${subject.subject_name}: ${remaining} periods unscheduled. ${reason}`);
                    }
                }
            }

            if (unmetDetails.length > 0) {
                logger.error('[Generator] Unmet requirements:', unmetDetails);
                throw new AcademicError(
                    `Could not satisfy all requirements:\n${unmetDetails.join('\n')}\n\nSuggestions:\n- Increase "Max Periods Per Day" for these subjects\n- Reduce total periods required\n- Check for teacher conflicts across sections`,
                    ErrorCodes.TIMETABLE_CONFLICT,
                    409
                );
            }

            // ============================================
            // PHASE 7: SAVE TO DATABASE
            // ============================================
            const requestId = Math.random().toString(36).substring(7);
            logger.info(`[Generator][Req:${requestId}] FINAL PHASE: Preparing to save ${resultSlots.length} slots...`);

            // Sanitize and Validate Data Integrity
            const sanitizedSlots: GeneratedSlot[] = resultSlots.map((slot) => ({
                ...slot,
                teacher_id: (slot.teacher_id && typeof slot.teacher_id === 'string' && slot.teacher_id.trim() !== '') ? slot.teacher_id : null,
                subject_id: (slot.subject_id && typeof slot.subject_id === 'string' && slot.subject_id.trim() !== '') ? slot.subject_id : null,
            }));

            // Verification Flow: Ensure all Subject and Teacher IDs actually exist in the DB
            // This prevents "current transaction is aborted" caused by Foreign Key violations
            const uniqueSubjectIds = [...new Set(sanitizedSlots.map((s) => s.subject_id).filter((id): id is string => Boolean(id)))];
            const uniqueTeacherIds = [...new Set(sanitizedSlots.map((s) => s.teacher_id).filter((id): id is string => Boolean(id)))];

            logger.info(`[Generator][Req:${requestId}] Verifying ${uniqueSubjectIds.length} Subjects and ${uniqueTeacherIds.length} Teachers...`);
            
            const [existingSubjects, existingTeachers] = await Promise.all([
                Subject.schema(schemaName).findAll({ where: { id: uniqueSubjectIds, institution_id: institutionId }, attributes: ['id'] }),
                Teacher.schema(schemaName).findAll({ where: { id: uniqueTeacherIds, institution_id: institutionId }, attributes: ['id'] })
            ]);

            const subjectIdsInDb = new Set(existingSubjects.map((s) => s.id));
            const teacherIdsInDb = new Set(existingTeachers.map((t) => t.id));

            for (const s of sanitizedSlots) {
                if (s.subject_id && !subjectIdsInDb.has(s.subject_id)) {
                    throw new AcademicError(`Data Integrity Violation: Subject ID ${s.subject_id} not found in database.`, ErrorCodes.INTERNAL_ERROR, 400);
                }
                if (s.teacher_id && !teacherIdsInDb.has(s.teacher_id)) {
                    throw new AcademicError(`Data Integrity Violation: Teacher ID ${s.teacher_id} not found in database.`, ErrorCodes.INTERNAL_ERROR, 400);
                }
            }

            // Execute Save in a managed transaction
            return await sequelize.transaction(async (transaction) => {
                const TimetableSlotTenant = TimetableSlot.schema(schemaName);

                // STEP 1: Aggressive Cleanup
                logger.info(`[Generator][Req:${requestId}] STEP 1: Deleting existing slots for Section: ${data.section_id}...`);
                const deletedCount = await TimetableSlotTenant.destroy({
                    where: { section_id: data.section_id, session_id: data.session_id },
                    transaction,
                    logging: (sql) => logger.info(`[Generator][Req:${requestId}] [SQL DELETE] ${sql}`)
                });
                logger.info(`[Generator][Req:${requestId}] STEP 1 Success: Deleted ${deletedCount} records.`);

                // STEP 2: Diagnostic Sequential Insert
                logger.info(`[Generator][Req:${requestId}] STEP 2: Inserting ${sanitizedSlots.length} slots...`);
                for (let i = 0; i < sanitizedSlots.length; i++) {
                    const slotData = sanitizedSlots[i];
                    if (!slotData) continue;
                    const slot = {
                        ...slotData,
                        slot_type: String(slotData.slot_type) 
                    };
                    
                    try {
                        await TimetableSlotTenant.create(slot, { 
                            transaction, 
                            hooks: false, 
                            validate: false,
                            logging: i === 0 ? (sql) => logger.info(`[Generator][Req:${requestId}] [SQL INSERT ROW 0] ${sql.substring(0, 150)}...`) : false
                        });
                    } catch (rowErr) {
                        logger.error(`[Generator][Req:${requestId}] FATAL ERROR AT ROW ${i} (Day ${slot.day_of_week}, Slot ${slot.slot_number})`);
                        
                        // Extract the REAL error from Postgres if available
                        const err = rowErr as Record<string, unknown>;
                        const pgError = err.parent || err.original || rowErr;
                        const pgErr = pgError as Record<string, unknown>;
                        logger.error(`  - Raw error info: ${pgErr.message ?? 'Unknown error'}`);
                        if (pgErr.detail) logger.error(`  - Detail: ${pgErr.detail}`);

                        const errName = err.name ?? '';
                        if (errName === 'SequelizeUniqueConstraintError' || (errName === 'SequelizeDatabaseError' && pgErr.code === '23505')) {
                            throw new AcademicError(`Duplicate slot at Day ${slot.day_of_week}, Slot ${slot.slot_number}. Please check if another user is generating for this section.`, ErrorCodes.TIMETABLE_CONFLICT, 409);
                        }
                        throw rowErr;
                    }
                }

                logger.info(`[Generator][Req:${requestId}] SUCCESS: All records committed.`);
                return {
                    success: true,
                    slots_created: sanitizedSlots.length,
                    warnings: warnings.length > 0 ? warnings : undefined
                };
            });

        } catch (error: unknown) {
            const err = error as Error & {
                name?: string;
                message?: string;
                original?: { detail?: string; message?: string; code?: string };
            };
            
            // Extract the deep detail if it's a database error
            const dbDetail = err.original?.detail || err.original?.message || '';
            const dbCode = err.original?.code || '';

            if (dbCode === '25P02') {
                logger.error('[Generator] Transaction was aborted by a hidden conflict. Check for multiple parallel generation requests.');
            } else {
                logger.error(`[Generator] Generation Failed: ${err.message}`, dbDetail ? `Detail: ${dbDetail}` : '');
            }

            if (error instanceof AcademicError) throw error;
            throw new AcademicError(`Timetable generation failed: ${err.message}. ${dbDetail}`, ErrorCodes.INTERNAL_ERROR, 500);
        }
    }

    /**
     * Get template by ID or find default/first active
     */
    private async getTemplate(schemaName: string, institutionId: string, templateId?: string): Promise<TimetableTemplate | null> {
        if (templateId) {
            return TimetableTemplate.schema(schemaName).findOne({
                where: { id: templateId, institution_id: institutionId }
            });
        }

        // Try default first
        let template = await TimetableTemplate.schema(schemaName).findOne({
            where: { institution_id: institutionId, is_default: true, is_active: true }
        });

        if (!template) {
            template = await TimetableTemplate.schema(schemaName).findOne({
                where: { institution_id: institutionId, is_active: true },
                order: [['created_at', 'ASC']]
            });
        }

        return template;
    }

    /**
     * Assign a slot and update tracking maps
     */
    private assignSlot(
        resultSlots: GeneratedSlot[],
        subject: SubjectToSchedule,
        day: number,
        slot: number,
        institutionId: string,
        classId: string,
        sectionId: string,
        sessionId: string,
        startTimeConf: string,
        slotDuration: number,
        remainingPeriods: Map<string, number>,
        subjectDayCount: Map<string, Map<number, number>>,
        subjectDaySlots: Map<string, Map<number, number[]>>,
        teacherDailyLoad: Map<string, Map<number, number>>
    ): void {
        const startTime = this.calculateStartTime(startTimeConf, slot, slotDuration);
        const endTime = this.calculateEndTime(startTime, slotDuration);

        resultSlots.push({
            institution_id: institutionId,
            class_id: classId,
            section_id: sectionId,
            session_id: sessionId,
            subject_id: subject.subject_id,
            teacher_id: subject.teacher_id,
            day_of_week: day,
            slot_number: slot,
            slot_type: TimetableSlotType.REGULAR,
            start_time: startTime,
            end_time: endTime,
            is_active: true
        });

        // Update remaining periods
        remainingPeriods.set(subject.id, (remainingPeriods.get(subject.id) || 0) - 1);

        // Update day count
        if (!subjectDayCount.has(subject.subject_id)) {
            subjectDayCount.set(subject.subject_id, new Map());
        }
        const dayCounts = subjectDayCount.get(subject.subject_id)!;
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);

        // Update day slots
        if (!subjectDaySlots.has(subject.subject_id)) {
            subjectDaySlots.set(subject.subject_id, new Map());
        }
        const daySlots = subjectDaySlots.get(subject.subject_id)!;
        if (!daySlots.has(day)) {
            daySlots.set(day, []);
        }
        daySlots.get(day)!.push(slot);

        // Update teacher daily load
        if (subject.teacher_id) {
            if (!teacherDailyLoad.has(subject.teacher_id)) {
                teacherDailyLoad.set(subject.teacher_id, new Map());
            }
            const teacherLoad = teacherDailyLoad.get(subject.teacher_id)!;
            teacherLoad.set(day, (teacherLoad.get(day) || 0) + 1);
        }
    }

    private calculateStartTime(baseStart: string, slotNum: number, duration: number): string {
        if (!baseStart || !baseStart.includes(':')) return '00:00';
        const parts = baseStart.split(':').map(Number);
        const hours = parts[0];
        const minutes = parts[1];
        if (hours === undefined || minutes === undefined || isNaN(hours) || isNaN(minutes)) return '00:00';
        const totalMinutes = (hours * 60 + minutes + (slotNum - 1) * (duration || 45));
        const h = Math.floor(totalMinutes / 60) % 24;
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    private calculateEndTime(start: string, duration: number): string {
        if (!start || !start.includes(':')) return '00:00';
        const parts = start.split(':').map(Number);
        const hours = parts[0];
        const minutes = parts[1];
        if (hours === undefined || minutes === undefined || isNaN(hours) || isNaN(minutes)) return '00:00';
        const totalMinutes = hours * 60 + minutes + (duration || 45);
        const h = Math.floor(totalMinutes / 60) % 24;
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
}

export const timetableGeneratorService = new TimetableGeneratorService();
