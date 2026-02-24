import { Router } from 'express';
import { examinationController } from '../controllers';
import { requirePermissionOrRole as legacyRequirePermissionOrRole } from '../../middlewares/permission.middleware';
import { requirePermission as rbacRequirePermission } from '../../../../core/rbac/rbac.middleware';
import { validateRequest } from '../../../../core/middleware/validation.middleware';
import {
    CreateExamSchema,
    UpdateExamSchema,
    UpdateExamStatusSchema,
    ExamIdParamSchema,
    CreateScheduleSchema,
    UpdateScheduleSchema,
    ScheduleIdParamSchema,
    ExamScheduleParamSchema,
    ClassScheduleParamSchema,
    EnterMarksSchema,
    MarksQueryParamSchema,
    StudentMarksParamSchema,
    CreateGradeSchema,
} from '../validators';

const router = Router();

/**
 * Exams RBAC Permission Wrapper
 * 
 * Environment Toggle:
 * - If RBAC_ENFORCE_EXAMS=true: Use RBAC requirePermission
 * - Else: Use legacy requirePermissionOrRole
 * 
 * This allows safe pilot rollout with instant rollback capability.
 */
function examsRequirePermission(permissions: string[], roles?: string[]) {
    const useRBAC = process.env.RBAC_ENFORCE_EXAMS === 'true';
    
    if (useRBAC) {
        return rbacRequirePermission(...permissions);
    } else {
        return legacyRequirePermissionOrRole(permissions, roles || ['Admin']);
    }
}

// ==================== Exams ====================
router.get('/',
    examsRequirePermission(['exams.view'], ['Admin', 'Teacher']),
    examinationController.getExams
);
router.post('/',
    examsRequirePermission(['exams.manage'], ['Admin']),
    validateRequest({ body: CreateExamSchema }),
    examinationController.createExam
);
router.put('/:id',
    examsRequirePermission(['exams.manage'], ['Admin']),
    validateRequest({ params: ExamIdParamSchema, body: UpdateExamSchema }),
    examinationController.updateExam
);
router.patch('/:id/status',
    examsRequirePermission(['exams.manage'], ['Admin']),
    validateRequest({ params: ExamIdParamSchema, body: UpdateExamStatusSchema }),
    examinationController.updateExamStatus
);
router.delete('/:id',
    examsRequirePermission(['exams.manage'], ['Admin']),
    validateRequest({ params: ExamIdParamSchema }),
    examinationController.deleteExam
);

// ==================== Schedules ====================
router.get('/:examId/schedules',
    examsRequirePermission(['exams.view'], ['Admin', 'Teacher']),
    validateRequest({ params: ExamScheduleParamSchema }),
    examinationController.getSchedules
);
router.get('/classes/:classId/schedules',
    examsRequirePermission(['exams.view'], ['Admin', 'Teacher', 'Student']),
    validateRequest({ params: ClassScheduleParamSchema }),
    examinationController.getSchedulesByClass
);
router.post('/schedules',
    examsRequirePermission(['exams.manage'], ['Admin']),
    validateRequest({ body: CreateScheduleSchema }),
    examinationController.createSchedule
);
router.put('/schedules/:id',
    examsRequirePermission(['exams.manage'], ['Admin']),
    validateRequest({ params: ScheduleIdParamSchema, body: UpdateScheduleSchema }),
    examinationController.updateSchedule
);
router.delete('/schedules/:id',
    examsRequirePermission(['exams.manage'], ['Admin']),
    validateRequest({ params: ScheduleIdParamSchema }),
    examinationController.deleteSchedule
);

// ==================== Marks ====================
router.get('/schedules/:examScheduleId/marks',
    examsRequirePermission(['exams.marks.view'], ['Admin', 'Teacher']),
    validateRequest({ params: MarksQueryParamSchema }),
    examinationController.getMarks
);
router.post('/marks',
    examsRequirePermission(['exams.marks.manage'], ['Admin', 'Teacher']),
    validateRequest({ body: EnterMarksSchema }),
    examinationController.enterMarks
);
router.get('/students/:studentId/marks',
    examsRequirePermission(['exams.marks.view'], ['Admin', 'Teacher', 'Student']),
    validateRequest({ params: StudentMarksParamSchema }),
    examinationController.getStudentMarks
);

// ==================== Grades ====================
router.get('/grades',
    examsRequirePermission(['exams.view'], ['Admin']),
    examinationController.getGrades
);
router.post('/grades',
    examsRequirePermission(['exams.manage'], ['Admin']),
    validateRequest({ body: CreateGradeSchema }),
    examinationController.createGrade
);

// ==================== Statistics ====================
router.get('/stats',
    examsRequirePermission(['exams.view'], ['Admin']),
    examinationController.getExamStats
);
router.get('/:id',
    examsRequirePermission(['exams.view'], ['Admin', 'Teacher']),
    validateRequest({ params: ExamIdParamSchema }),
    examinationController.getExamById
);

export default router;

