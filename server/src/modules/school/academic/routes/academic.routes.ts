import { Router } from 'express';
import { requirePermissionOrRole as legacyRequirePermissionOrRole } from '../../middlewares/permission.middleware';
import { requirePermission as rbacRequirePermission } from '../../../../core/rbac/rbac.middleware';
import { validate, validateParams, validateQuery } from '../../../../core/middleware/validate.middleware';
import { logger } from '../../../../core/utils/logger';
import { 
    academicSessionController,
    academicAdminController,
    classController,
    sectionController,
    subjectController,
    curriculumController,
    lessonPlanController,
    timetableController,
    statsController,
    academicCalendarController
} from '../controllers';
import {
    createAcademicSessionSchema,
    updateAcademicSessionSchema,
    createAcademicTermSchema,
    updateAcademicTermSchema,
    createSessionHolidaySchema,
    updateSessionHolidaySchema,
    createMasterHolidaySchema,
    updateMasterHolidaySchema,
    syncMasterHolidaysSchema,
    lockAcademicSessionSchema,
    bulkPromotionSchema,
    createNextSessionSchema,
    createAcademicYearSchema,
    updateAcademicYearSchema,
    createClassSchema,
    updateClassSchema,
    updateSectionSchema,
    createSectionSchema,
    createSubjectSchema,
    updateSubjectSchema,
    createChapterSchema,
    updateChapterSchema,
    createTopicSchema,
    updateTopicSchema,
    topicCompletionSchema,
    createLessonPlanSchema,
    updateLessonPlanSchema,
    updateLessonPlanStatusSchema,
    createTimetableTemplateSchema,
    updateTimetableTemplateSchema,
    createTimetableSlotSchema,
    updateTimetableSlotSchema,
    bulkCreateTimetableSlotsSchema,
    copyTimetableSchema,
    generateTimetableSchema,
    classReorderSchema,
    createClassTeacherAssignmentSchema,
    createSubjectTeacherAssignmentSchema,
    assignSubjectToClassSchema,
    updateClassSubjectAssignmentSchema,
    addTimetablePeriodSchema,
    timetableConflictCheckSchema,
    academicYearIdParamSchema,
    sessionTermParamSchema,
    sessionHolidayParamSchema,
    holidayIdParamSchema,
    entityIdParamSchema,
    teacherIdParamSchema,
    classIdParamSchema,
    classSectionParamSchema,
    classSubjectParamSchema,
    sectionIdParamSchema,
    academicYearQuerySchema
} from '../validators/academic-management.validators';

const router = Router();

/**
 * Academics RBAC Permission Wrapper
 * 
 * Environment Toggle:
 * - If RBAC_ENFORCE_ACADEMICS=true: Use RBAC requirePermission (with mapping)
 * - Else: Use legacy requirePermissionOrRole
 * 
 * This allows safe pilot rollout with instant rollback capability.
 * 
 * @param permissions - Array of permission strings (e.g., ['academics.classes.view'])
 * @param roles - Array of allowed roles (legacy fallback)
 * @returns Express middleware function
 */
function academicsRequirePermission(permissions: string[], roles?: string[]) {
    const useRBAC = process.env.RBAC_ENFORCE_ACADEMICS === 'true';
    
    if (useRBAC) {
        // RBAC mode: Use permission mapping layer
        logger.info(`[RBAC Pilot] Using RBAC enforcement for: ${permissions.join(', ')}`);
        return rbacRequirePermission(...permissions);
    } else {
        // Legacy mode: Use role-based fallback
        return legacyRequirePermissionOrRole(permissions, roles || ['Admin']);
    }
}

// ==================== Academic Calendar ====================
router.get('/calendar/day',
    academicsRequirePermission(['academics.sessions.view'], ['Admin', 'Teacher', 'Student']),
    academicCalendarController.getDayStatus
);

router.get('/calendar/range',
    academicsRequirePermission(['academics.sessions.view'], ['Admin', 'Teacher', 'Student']),
    academicCalendarController.getCalendarRange
);

// ==================== Academic Sessions ====================
router.get('/academic-sessions', 
    academicsRequirePermission(['academics.sessions.view'], ['Admin']), 
    academicSessionController.getAll
);
router.get('/academic-sessions/current', 
    academicsRequirePermission(['academics.sessions.view'], ['Admin', 'Teacher', 'Student']), 
    academicSessionController.getCurrent
);
router.get('/academic-sessions/:id', 
    academicsRequirePermission(['academics.sessions.view'], ['Admin']), 
    academicSessionController.getById
);
router.post('/academic-sessions', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validate(createAcademicSessionSchema),
    academicSessionController.create
);
router.put('/academic-sessions/:id', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    validate(updateAcademicSessionSchema),
    academicSessionController.update
);
router.delete('/academic-sessions/:id', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']), 
    academicSessionController.delete
);

// Terms & Holidays
router.post('/academic-sessions/:id/terms', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    validate(createAcademicTermSchema),
    academicSessionController.addTerm
);
router.put('/academic-sessions/:id/terms/:termId', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(sessionTermParamSchema),
    validate(updateAcademicTermSchema),
    academicSessionController.updateTerm
);
router.delete('/academic-sessions/:id/terms/:termId', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']), 
    academicSessionController.deleteTerm
);
router.post('/academic-sessions/:id/holidays', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    validate(createSessionHolidaySchema),
    academicSessionController.addHoliday
);
router.put('/academic-sessions/:id/holidays/:holidayId', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(sessionHolidayParamSchema),
    validate(updateSessionHolidaySchema),
    academicSessionController.updateHoliday
);
router.delete('/academic-sessions/:id/holidays/:holidayId', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']), 
    academicSessionController.deleteHoliday
);

// Master Holidays (Recurring)
router.get('/master-holidays', 
    academicSessionController.getAllMasterHolidays
);
router.post('/master-holidays', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validate(createMasterHolidaySchema),
    academicSessionController.addMasterHoliday
);
router.put('/master-holidays/:holidayId', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(holidayIdParamSchema),
    validate(updateMasterHolidaySchema),
    academicSessionController.updateMasterHoliday
);
router.delete('/master-holidays/:holidayId', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']), 
    academicSessionController.deleteMasterHoliday
);
router.post('/master-holidays/sync', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validate(syncMasterHolidaysSchema),
    academicSessionController.syncMasterHolidays
);


// Session Management (Locking & Promotion)
router.post('/academic-sessions/:id/lock', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    validate(lockAcademicSessionSchema),
    academicSessionController.lock
);
router.post('/academic-sessions/:id/unlock', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    validate(lockAcademicSessionSchema),
    academicSessionController.unlock
);
router.get('/academic-sessions/:id/lock-status', 
    academicsRequirePermission(['academics.sessions.view'], ['Admin']), 
    academicSessionController.getLockStatus
);
router.post('/academic-sessions/promote', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validate(bulkPromotionSchema),
    academicSessionController.promote
);
router.post('/academic-sessions/transition', 
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validate(createNextSessionSchema),
    academicSessionController.transition
);

// ==================== Academic Management (New Endpoints) ====================
// Academic Years
router.get('/academic/years',
    academicsRequirePermission(['academics.sessions.view'], ['Admin']),
    academicAdminController.getAcademicYears
);
router.post('/academic/years',
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validate(createAcademicYearSchema),
    academicAdminController.createAcademicYear
);
router.put('/academic/years/:id',
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    validate(updateAcademicYearSchema),
    academicAdminController.updateAcademicYear
);
router.post('/academic/years/:id/set-active',
    academicsRequirePermission(['academics.sessions.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    validate(syncMasterHolidaysSchema),
    academicAdminController.setActiveAcademicYear
);

// Academic Classes
router.get('/academic/classes',
    academicsRequirePermission(['academics.classes.view'], ['Admin', 'Teacher']),
    classController.listAcademic
);
router.post('/academic/classes',
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validate(createClassSchema),
    classController.createAcademic
);
router.put('/academic/classes/:id',
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    validate(updateClassSchema),
    classController.updateAcademic
);
router.delete('/academic/classes/:id',
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    classController.deleteAcademic
);

// Sections (exact requested paths)
router.get('/academic/classes/:classId/sections',
    academicsRequirePermission(['academics.classes.view'], ['Admin', 'Teacher']),
    validateParams(classIdParamSchema),
    sectionController.getByClassId
);
router.post('/academic/classes/:classId/sections',
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validate(createSectionSchema),
    validateParams(classIdParamSchema),
    sectionController.createByClassPath
);
router.put('/academic/classes/:classId/sections/:sectionId',
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validateParams(classSectionParamSchema),
    validate(createSectionSchema.partial().refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })),
    sectionController.updateByClassPath
);
router.delete('/academic/classes/:classId/sections/:sectionId',
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validateParams(classSectionParamSchema),
    sectionController.deleteByClassPath
);

// Teacher Assignments
router.post('/academic/assign/class-teacher',
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validate(createClassTeacherAssignmentSchema),
    academicAdminController.assignClassTeacher
);
router.post('/academic/assign/subject-teacher',
    academicsRequirePermission(['academics.subjects.manage'], ['Admin']),
    validate(createSubjectTeacherAssignmentSchema),
    academicAdminController.assignSubjectTeacher
);
router.get('/academic/assignments/teacher/:teacherId',
    academicsRequirePermission(['academics.classes.view'], ['Admin', 'Teacher']),
    validateParams(teacherIdParamSchema),
    subjectController.getTeacherAssignments
);
router.get('/academic/assignments/section/:sectionId',
    academicsRequirePermission(['academics.classes.view'], ['Admin', 'Teacher']),
    validateParams(sectionIdParamSchema),
    subjectController.getSectionAssignments
);

// Academic Timetable (exact requested paths)
router.post('/academic/timetable',
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validate(addTimetablePeriodSchema),
    timetableController.addAcademicTimetablePeriod
);
router.get('/academic/timetable/class/:classId/section/:sectionId',
    academicsRequirePermission(['academics.timetable.view'], ['Admin', 'Teacher', 'Student']),
    validateParams(classSectionParamSchema),
    validateQuery(academicYearQuerySchema),
    timetableController.getAcademicClassTimetableByPath
);
router.get('/academic/timetable/teacher/:teacherId',
    academicsRequirePermission(['academics.timetable.view'], ['Admin', 'Teacher']),
    validateParams(teacherIdParamSchema),
    validateQuery(academicYearQuerySchema),
    timetableController.getAcademicTeacherTimetableByPath
);
router.put('/academic/timetable/:id',
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    validate(addTimetablePeriodSchema.partial().refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })),
    timetableController.updateAcademicTimetablePeriod
);
router.delete('/academic/timetable/:id',
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validateParams(academicYearIdParamSchema),
    timetableController.deleteAcademicTimetablePeriod
);
router.post('/academic/timetable/check-conflicts',
    academicsRequirePermission(['academics.timetable.view'], ['Admin', 'Teacher']),
    validate(timetableConflictCheckSchema),
    timetableController.checkAcademicConflicts
);

// Subjects (exact requested paths)
router.get('/academic/classes/:classId/subjects',
    academicsRequirePermission(['academics.subjects.view'], ['Admin', 'Teacher']),
    validateParams(classIdParamSchema),
    subjectController.getClassSubjects
);
router.post('/academic/classes/:classId/subjects',
    academicsRequirePermission(['academics.subjects.manage'], ['Admin']),
    validateParams(classIdParamSchema),
    validate(assignSubjectToClassSchema),
    subjectController.assignToClass
);
router.put('/academic/classes/:classId/subjects/:subjectId',
    academicsRequirePermission(['academics.subjects.manage'], ['Admin']),
    validateParams(classSubjectParamSchema),
    validate(updateClassSubjectAssignmentSchema),
    subjectController.updateClassSubject
);
router.delete('/academic/classes/:classId/subjects/:subjectId',
    academicsRequirePermission(['academics.subjects.manage'], ['Admin']),
    validateParams(classSubjectParamSchema),
    subjectController.removeFromClass
);

// ==================== Classes ====================
router.get('/classes', 
    academicsRequirePermission(['academics.classes.view'], ['Admin', 'Teacher']), 
    classController.getAll
);
router.get('/classes/:id', 
    academicsRequirePermission(['academics.classes.view'], ['Admin', 'Teacher']), 
    classController.getById
);
router.post('/classes', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validate(createClassSchema),
    classController.create
);
router.put('/classes/:id', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validateParams(entityIdParamSchema),
    validate(updateClassSchema),
    classController.update
);
router.delete('/classes/:id', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']), 
    classController.delete
);
router.post('/classes/reorder', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validate(classReorderSchema),
    classController.reorder
);

// ==================== Sections ====================
router.get('/sections', 
    academicsRequirePermission(['academics.classes.view'], ['Admin', 'Teacher']), 
    sectionController.getAll
);
router.get('/sections/:id', 
    academicsRequirePermission(['academics.classes.view'], ['Admin', 'Teacher']), 
    sectionController.getById
);
router.post('/classes/:classId/sections', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validateParams(classIdParamSchema),
    validate(createSectionSchema),
    sectionController.create
);
router.put('/sections/:id', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validateParams(entityIdParamSchema),
    validate(updateSectionSchema),
    sectionController.update
);
router.delete('/sections/:id', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']), 
    sectionController.delete
);

// ==================== Subjects ====================
router.get('/subjects', 
    academicsRequirePermission(['academics.subjects.view'], ['Admin', 'Teacher']), 
    subjectController.getAll
);
router.get('/subjects/:id', 
    academicsRequirePermission(['academics.subjects.view'], ['Admin', 'Teacher']), 
    subjectController.getById
);
router.post('/subjects', 
    academicsRequirePermission(['academics.subjects.manage'], ['Admin']),
    validate(createSubjectSchema),
    subjectController.create
);
router.put('/subjects/:id', 
    academicsRequirePermission(['academics.subjects.manage'], ['Admin']),
    validateParams(entityIdParamSchema),
    validate(updateSubjectSchema),
    subjectController.update
);
router.delete('/subjects/:id', 
    academicsRequirePermission(['academics.subjects.manage'], ['Admin']), 
    subjectController.delete
);

// ==================== Class-Subject Assignments ====================
router.get('/classes/:classId/subjects', 
    academicsRequirePermission(['academics.classes.view'], ['Admin', 'Teacher']), 
    subjectController.getClassSubjects
);
router.post('/classes/:classId/subjects', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validateParams(classIdParamSchema),
    validate(assignSubjectToClassSchema),
    subjectController.assignToClass
);
router.put('/classes/:classId/subjects/:subjectId', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']),
    validateParams(classSubjectParamSchema),
    validate(updateClassSubjectAssignmentSchema),
    subjectController.updateClassSubject
);
router.delete('/classes/:classId/subjects/:subjectId', 
    academicsRequirePermission(['academics.classes.manage'], ['Admin']), 
    subjectController.removeFromClass
);

// ==================== Chapters ====================
router.get('/subjects/:subjectId/chapters', 
    academicsRequirePermission(['academics.curriculum.view'], ['Admin', 'Teacher']), 
    curriculumController.getChapters
);
router.get('/chapters/:id', 
    academicsRequirePermission(['academics.curriculum.view'], ['Admin', 'Teacher']), 
    curriculumController.getChapterById
);
router.post('/chapters', 
    academicsRequirePermission(['academics.curriculum.manage'], ['Admin', 'Teacher']),
    validate(createChapterSchema),
    curriculumController.createChapter
);
router.put('/chapters/:id', 
    academicsRequirePermission(['academics.curriculum.manage'], ['Admin', 'Teacher']),
    validateParams(entityIdParamSchema),
    validate(updateChapterSchema),
    curriculumController.updateChapter
);
router.delete('/chapters/:id', 
    academicsRequirePermission(['academics.curriculum.manage'], ['Admin']), 
    curriculumController.deleteChapter
);

// ==================== Topics ====================
router.get('/chapters/:chapterId/topics', 
    academicsRequirePermission(['academics.curriculum.view'], ['Admin', 'Teacher']), 
    curriculumController.getTopics
);
router.get('/topics/:id', 
    academicsRequirePermission(['academics.curriculum.view'], ['Admin', 'Teacher']), 
    curriculumController.getTopicById
);
router.post('/topics', 
    academicsRequirePermission(['academics.curriculum.manage'], ['Admin', 'Teacher']),
    validate(createTopicSchema),
    curriculumController.createTopic
);
router.put('/topics/:id', 
    academicsRequirePermission(['academics.curriculum.manage'], ['Admin', 'Teacher']),
    validateParams(entityIdParamSchema),
    validate(updateTopicSchema),
    curriculumController.updateTopic
);
router.delete('/topics/:id', 
    academicsRequirePermission(['academics.curriculum.manage'], ['Admin']), 
    curriculumController.deleteTopic
);
router.patch('/topics/:id/complete', 
    academicsRequirePermission(['academics.curriculum.manage'], ['Admin', 'Teacher']),
    validateParams(entityIdParamSchema),
    validate(topicCompletionSchema),
    curriculumController.markTopicCompleted
);

// ==================== Lesson Plans ====================
router.get('/lesson-plans', 
    academicsRequirePermission(['academics.lessonPlans.view'], ['Admin', 'Teacher']), 
    lessonPlanController.getAll
);
router.get('/lesson-plans/upcoming', 
    academicsRequirePermission(['academics.lessonPlans.view'], ['Admin', 'Teacher']), 
    lessonPlanController.getUpcoming
);
router.get('/lesson-plans/teacher/:teacherId', 
    academicsRequirePermission(['academics.lessonPlans.view'], ['Admin', 'Teacher']), 
    lessonPlanController.getByTeacher
);
router.get('/lesson-plans/:id', 
    academicsRequirePermission(['academics.lessonPlans.view'], ['Admin', 'Teacher']), 
    lessonPlanController.getById
);
router.post('/lesson-plans', 
    academicsRequirePermission(['academics.lessonPlans.manage'], ['Admin', 'Teacher']),
    validate(createLessonPlanSchema),
    lessonPlanController.create
);
router.put('/lesson-plans/:id', 
    academicsRequirePermission(['academics.lessonPlans.manage'], ['Admin', 'Teacher']),
    validateParams(entityIdParamSchema),
    validate(updateLessonPlanSchema),
    lessonPlanController.update
);
router.patch('/lesson-plans/:id/status', 
    academicsRequirePermission(['academics.lessonPlans.manage'], ['Admin', 'Teacher']),
    validateParams(entityIdParamSchema),
    validate(updateLessonPlanStatusSchema),
    lessonPlanController.updateStatus
);
router.delete('/lesson-plans/:id', 
    academicsRequirePermission(['academics.lessonPlans.manage'], ['Admin']), 
    lessonPlanController.delete
);

// ==================== Statistics ====================
router.get('/stats', 
    academicsRequirePermission(['academics.classes.view'], ['Admin']), 
    statsController.getStats
);

// ==================== Timetable ====================
// Templates
router.get('/timetable/templates', 
    academicsRequirePermission(['academics.timetable.view'], ['Admin', 'Teacher']), 
    timetableController.getTemplates
);
router.get('/timetable/templates/:id', 
    academicsRequirePermission(['academics.timetable.view'], ['Admin', 'Teacher']), 
    timetableController.getTemplateById
);
router.post('/timetable/templates', 
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validate(createTimetableTemplateSchema),
    timetableController.createTemplate
);
router.put('/timetable/templates/:id', 
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validateParams(entityIdParamSchema),
    validate(updateTimetableTemplateSchema),
    timetableController.updateTemplate
);
router.delete('/timetable/templates/:id', 
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']), 
    timetableController.deleteTemplate
);

// Timetable Views
router.get('/timetable/sections/:sectionId', 
    academicsRequirePermission(['academics.timetable.view'], ['Admin', 'Teacher', 'Student']), 
    timetableController.getSectionTimetable
);
router.get('/timetable/teachers/:teacherId', 
    academicsRequirePermission(['academics.timetable.view'], ['Admin', 'Teacher']), 
    timetableController.getTeacherTimetable
);

// Slots Management
router.get('/timetable/slots', 
    academicsRequirePermission(['academics.timetable.view'], ['Admin', 'Teacher']), 
    timetableController.getSlots
);
router.post('/timetable/slots', 
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validate(createTimetableSlotSchema),
    timetableController.createSlot
);
router.put('/timetable/slots/:id', 
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validateParams(entityIdParamSchema),
    validate(updateTimetableSlotSchema),
    timetableController.updateSlot
);
router.delete('/timetable/slots/:id', 
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']), 
    timetableController.deleteSlot
);
router.post('/timetable/slots/bulk', 
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validate(bulkCreateTimetableSlotsSchema),
    timetableController.bulkCreateSlots
);
router.post('/timetable/copy', 
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validate(copyTimetableSchema),
    timetableController.copyTimetable
);
router.post('/timetable/sections/:sectionId/generate', 
    academicsRequirePermission(['academics.timetable.manage'], ['Admin']),
    validateParams(sectionIdParamSchema),
    validate(generateTimetableSchema),
    timetableController.generateTimetable
);

export default router;

