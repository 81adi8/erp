import { Transaction, CreationAttributes } from 'sequelize';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../database/models/school/academics/class/Section.model';
import { Subject } from '../../../../database/models/school/academics/curriculum/Subject.model';
import { ClassSubject } from '../../../../database/models/school/academics/curriculum/ClassSubject.model';
import { StudentEnrollment, StudentEnrollmentStatus } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import { AcademicYear } from '../../../../database/models/school/academics/session/AcademicYear.model';
import { ClassTeacherAssignment } from '../../../../database/models/school/academics/assignments/ClassTeacherAssignment.model';
import { SubjectTeacherAssignment } from '../../../../database/models/school/academics/assignments/SubjectTeacherAssignment.model';
import { Teacher } from '../../../../database/models/school/academics/staff/Teacher.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { Timetable, DayOfWeek } from '../../../../database/models/school/academics/timetable/Timetable.model';
import { Op } from 'sequelize';

export class AcademicRepository {
    // Academic years
    async findAllAcademicYears(schema: string, institutionId: string) {
        return AcademicYear.schema(schema).findAll({
            where: { institution_id: institutionId },
            order: [['start_date', 'DESC']]
        });
    }

    async findAcademicYearById(schema: string, institutionId: string, id: string) {
        return AcademicYear.schema(schema).findOne({
            where: { id, institution_id: institutionId }
        });
    }

    async findAcademicYearByName(schema: string, institutionId: string, name: string, excludeId?: string) {
        return AcademicYear.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                name,
                ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
            }
        });
    }

    async createAcademicYear(
        schema: string,
        payload: CreationAttributes<AcademicYear>,
        transaction?: Transaction
    ) {
        return AcademicYear.schema(schema).create(payload, { transaction });
    }

    async updateAcademicYearById(
        schema: string,
        institutionId: string,
        id: string,
        payload: Partial<AcademicYear>,
        transaction?: Transaction
    ) {
        await AcademicYear.schema(schema).update(payload, {
            where: { id, institution_id: institutionId },
            transaction
        });

        return this.findAcademicYearById(schema, institutionId, id);
    }

    async setOnlyActiveAcademicYear(
        schema: string,
        institutionId: string,
        id: string,
        transaction?: Transaction
    ) {
        await AcademicYear.schema(schema).update(
            { is_active: false },
            {
                where: { institution_id: institutionId },
                transaction
            }
        );

        await AcademicYear.schema(schema).update(
            { is_active: true },
            {
                where: { id, institution_id: institutionId },
                transaction
            }
        );
    }

    async deleteAcademicYearById(
        schema: string,
        institutionId: string,
        id: string,
        transaction?: Transaction
    ) {
        return AcademicYear.schema(schema).destroy({
            where: {
                id,
                institution_id: institutionId
            },
            transaction
        });
    }

    // Classes
    async findAllClasses(schema: string, institutionId: string, academicYearId?: string) {
        return Class.schema(schema).findAll({
            where: {
                institution_id: institutionId,
                ...(academicYearId ? { academic_year_id: academicYearId } : {})
            },
            order: [['display_order', 'ASC'], ['name', 'ASC']]
        });
    }

    async findClassById(schema: string, institutionId: string, id: string) {
        return Class.schema(schema).findOne({
            where: { id, institution_id: institutionId }
        });
    }

    async findClassByName(
        schema: string,
        institutionId: string,
        name: string,
        academicYearId?: string,
        excludeId?: string
    ) {
        return Class.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                name,
                ...(academicYearId ? { academic_year_id: academicYearId } : {}),
                ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
            }
        });
    }

    async createClass(schema: string, payload: Partial<Class>, transaction?: Transaction) {
        // NOTE: Cast needed - Sequelize create expects full model attrs, but we pass partial for creation
        return Class.schema(schema).create(payload as CreationAttributes<Class>, { transaction });
    }

    async updateClassById(
        schema: string,
        institutionId: string,
        id: string,
        payload: Partial<Class>,
        transaction?: Transaction
    ) {
        await Class.schema(schema).update(payload, {
            where: { id, institution_id: institutionId },
            transaction
        });

        return this.findClassById(schema, institutionId, id);
    }

    async countActiveEnrollmentsByClass(schema: string, institutionId: string, classId: string) {
        return StudentEnrollment.schema(schema).count({
            where: {
                institution_id: institutionId,
                class_id: classId,
                status: StudentEnrollmentStatus.ACTIVE
            }
        });
    }

    async deleteClassById(schema: string, institutionId: string, id: string, transaction?: Transaction) {
        return Class.schema(schema).destroy({
            where: { id, institution_id: institutionId },
            transaction
        });
    }

    // Sections
    async findSectionsByClassId(schema: string, institutionId: string, classId: string) {
        return Section.schema(schema).findAll({
            where: {
                institution_id: institutionId,
                class_id: classId
            },
            order: [['name', 'ASC']]
        });
    }

    async findSectionById(schema: string, institutionId: string, sectionId: string) {
        return Section.schema(schema).findOne({
            where: {
                id: sectionId,
                institution_id: institutionId
            }
        });
    }

    async findSectionByName(
        schema: string,
        institutionId: string,
        classId: string,
        name: string,
        excludeId?: string
    ) {
        return Section.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                class_id: classId,
                name,
                ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
            }
        });
    }

    async createSection(schema: string, payload: Partial<Section>, transaction?: Transaction) {
        // NOTE: Cast needed - Sequelize create expects full model attrs
        return Section.schema(schema).create(payload as CreationAttributes<Section>, { transaction });
    }

    async updateSectionById(
        schema: string,
        institutionId: string,
        sectionId: string,
        payload: Partial<Section>,
        transaction?: Transaction
    ) {
        await Section.schema(schema).update(payload, {
            where: {
                id: sectionId,
                institution_id: institutionId
            },
            transaction
        });

        return this.findSectionById(schema, institutionId, sectionId);
    }

    async countActiveEnrollmentsBySection(schema: string, institutionId: string, sectionId: string) {
        return StudentEnrollment.schema(schema).count({
            where: {
                institution_id: institutionId,
                section_id: sectionId,
                status: StudentEnrollmentStatus.ACTIVE
            }
        });
    }

    async deleteSectionById(schema: string, institutionId: string, sectionId: string, transaction?: Transaction) {
        return Section.schema(schema).destroy({
            where: {
                id: sectionId,
                institution_id: institutionId
            },
            transaction
        });
    }

    // Subjects
    async findAllSubjects(schema: string, institutionId: string) {
        return Subject.schema(schema).findAll({
            where: {
                institution_id: institutionId
            },
            order: [['name', 'ASC']]
        });
    }

    async findSubjectsByClassId(schema: string, institutionId: string, classId: string) {
        return ClassSubject.schema(schema).findAll({
            where: {
                institution_id: institutionId,
                class_id: classId,
                is_active: true
            },
            include: [
                {
                    model: Subject.schema(schema),
                    as: 'subject'
                }
            ],
            order: [['created_at', 'ASC']]
        });
    }

    async findSubjectById(schema: string, institutionId: string, subjectId: string) {
        return Subject.schema(schema).findOne({
            where: {
                id: subjectId,
                institution_id: institutionId
            }
        });
    }

    async findSubjectByNameOrCode(
        schema: string,
        institutionId: string,
        name: string,
        code: string,
        excludeId?: string
    ) {
        return Subject.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                [Op.or]: [
                    { name },
                    { code }
                ],
                ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
            }
        });
    }

    async createSubject(schema: string, payload: Partial<Subject>, transaction?: Transaction) {
        // NOTE: Cast needed - Sequelize create expects full model attrs
        return Subject.schema(schema).create(payload as CreationAttributes<Subject>, { transaction });
    }

    async findClassSubjectAssignment(
        schema: string,
        institutionId: string,
        classId: string,
        subjectId: string,
        academicYearId?: string
    ) {
        return ClassSubject.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                class_id: classId,
                subject_id: subjectId,
                ...(academicYearId ? { academic_year_id: academicYearId } : {})
            }
        });
    }

    async createClassSubjectAssignment(
        schema: string,
        payload: Partial<ClassSubject>,
        transaction?: Transaction
    ) {
        // NOTE: Cast needed - Sequelize create expects full model attrs
        return ClassSubject.schema(schema).create(payload as CreationAttributes<ClassSubject>, { transaction });
    }

    async deleteClassSubjectAssignment(
        schema: string,
        institutionId: string,
        classId: string,
        subjectId: string,
        transaction?: Transaction
    ) {
        return ClassSubject.schema(schema).destroy({
            where: {
                institution_id: institutionId,
                class_id: classId,
                subject_id: subjectId
            },
            transaction
        });
    }

    async countClassSubjectUsage(schema: string, institutionId: string, subjectId: string) {
        return ClassSubject.schema(schema).count({
            where: {
                institution_id: institutionId,
                subject_id: subjectId
            }
        });
    }

    async updateSubjectById(
        schema: string,
        institutionId: string,
        subjectId: string,
        payload: Partial<Subject>,
        transaction?: Transaction
    ) {
        await Subject.schema(schema).update(payload, {
            where: {
                id: subjectId,
                institution_id: institutionId
            },
            transaction
        });

        return this.findSubjectById(schema, institutionId, subjectId);
    }

    async deleteSubjectById(schema: string, institutionId: string, subjectId: string, transaction?: Transaction) {
        return Subject.schema(schema).destroy({
            where: {
                id: subjectId,
                institution_id: institutionId
            },
            transaction
        });
    }

    // Teacher assignments
    async findTeacherById(schema: string, institutionId: string, teacherId: string) {
        return Teacher.schema(schema).findOne({
            where: {
                id: teacherId,
                institution_id: institutionId,
                is_active: true
            }
        });
    }

    async findTeacherByUserId(schema: string, institutionId: string, userId: string) {
        return Teacher.schema(schema).findOne({
            where: {
                user_id: userId,
                institution_id: institutionId,
                is_active: true
            }
        });
    }

    async findClassTeacherAssignment(
        schema: string,
        institutionId: string,
        academicYearId: string,
        sectionId: string
    ) {
        return ClassTeacherAssignment.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                academic_year_id: academicYearId,
                section_id: sectionId
            }
        });
    }

    async upsertClassTeacherAssignment(
        schema: string,
        institutionId: string,
        payload: Partial<ClassTeacherAssignment>,
        transaction?: Transaction
    ) {
        const existing = await this.findClassTeacherAssignment(
            schema,
            institutionId,
            payload.academic_year_id as string,
            payload.section_id as string
        );

        if (existing) {
            await existing.update(payload, { transaction });
            return existing;
        }

        // NOTE: Cast needed - Sequelize create expects full model attrs
        return ClassTeacherAssignment.schema(schema).create(payload as CreationAttributes<ClassTeacherAssignment>, { transaction });
    }

    async createClassTeacherAssignment(
        schema: string,
        payload: Partial<ClassTeacherAssignment>,
        transaction?: Transaction
    ) {
        // NOTE: Cast needed - Sequelize create expects full model attrs
        return ClassTeacherAssignment.schema(schema).create(payload as CreationAttributes<ClassTeacherAssignment>, { transaction });
    }

    async upsertSubjectTeacherAssignment(
        schema: string,
        institutionId: string,
        payload: Partial<SubjectTeacherAssignment>,
        transaction?: Transaction
    ) {
        const existing = await SubjectTeacherAssignment.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                academic_year_id: payload.academic_year_id,
                subject_id: payload.subject_id,
                section_id: payload.section_id
            }
        });

        if (existing) {
            await existing.update(payload, { transaction });
            return existing;
        }

        // NOTE: Cast needed - Sequelize create expects full model attrs
        return SubjectTeacherAssignment.schema(schema).create(payload as CreationAttributes<SubjectTeacherAssignment>, { transaction });
    }

    async createSubjectTeacherAssignment(
        schema: string,
        payload: Partial<SubjectTeacherAssignment>,
        transaction?: Transaction
    ) {
        // NOTE: Cast needed - Sequelize create expects full model attrs
        return SubjectTeacherAssignment.schema(schema).create(payload as CreationAttributes<SubjectTeacherAssignment>, { transaction });
    }

    async findSubjectTeacherAssignment(
        schema: string,
        institutionId: string,
        academicYearId: string,
        subjectId: string,
        sectionId: string
    ) {
        return SubjectTeacherAssignment.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                academic_year_id: academicYearId,
                subject_id: subjectId,
                section_id: sectionId
            }
        });
    }

    async findAssignmentsByTeacher(schema: string, institutionId: string, teacherId: string) {
        const classAssignments = await ClassTeacherAssignment.schema(schema).findAll({
            where: {
                institution_id: institutionId,
                teacher_id: teacherId
            },
            include: [
                { model: Class.schema(schema), as: 'class' },
                { model: Section.schema(schema), as: 'section' },
                { model: AcademicYear.schema(schema), as: 'academic_year' }
            ]
        });

        const subjectAssignments = await SubjectTeacherAssignment.schema(schema).findAll({
            where: {
                institution_id: institutionId,
                teacher_id: teacherId
            },
            include: [
                { model: Subject.schema(schema), as: 'subject' },
                { model: Section.schema(schema), as: 'section' },
                { model: AcademicYear.schema(schema), as: 'academic_year' }
            ]
        });

        return { classAssignments, subjectAssignments };
    }

    async findAssignmentsBySection(schema: string, institutionId: string, sectionId: string) {
        const classAssignment = await ClassTeacherAssignment.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                section_id: sectionId
            },
            include: [
                {
                    model: Teacher.schema(schema),
                    as: 'teacher',
                    include: [{ model: User.schema(schema), as: 'user' }]
                },
                { model: Class.schema(schema), as: 'class' },
                { model: AcademicYear.schema(schema), as: 'academic_year' }
            ]
        });

        const subjectAssignments = await SubjectTeacherAssignment.schema(schema).findAll({
            where: {
                institution_id: institutionId,
                section_id: sectionId
            },
            include: [
                {
                    model: Teacher.schema(schema),
                    as: 'teacher',
                    include: [{ model: User.schema(schema), as: 'user' }]
                },
                { model: Subject.schema(schema), as: 'subject' },
                { model: AcademicYear.schema(schema), as: 'academic_year' }
            ]
        });

        return { classAssignment, subjectAssignments };
    }

    // Timetable
    async findTimetableById(schema: string, institutionId: string, id: string) {
        return Timetable.schema(schema).findOne({
            where: {
                id,
                institution_id: institutionId,
                is_active: true
            }
        });
    }

    async findClassSlotConflict(
        schema: string,
        institutionId: string,
        academicYearId: string,
        classId: string,
        sectionId: string,
        dayOfWeek: DayOfWeek,
        periodNumber: number,
        excludeId?: string
    ) {
        return Timetable.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                academic_year_id: academicYearId,
                class_id: classId,
                section_id: sectionId,
                day_of_week: dayOfWeek,
                period_number: periodNumber,
                is_active: true,
                ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
            }
        });
    }

    async findTeacherSlotConflict(
        schema: string,
        institutionId: string,
        academicYearId: string,
        teacherId: string,
        dayOfWeek: DayOfWeek,
        periodNumber: number,
        excludeId?: string
    ) {
        return Timetable.schema(schema).findOne({
            where: {
                institution_id: institutionId,
                academic_year_id: academicYearId,
                teacher_id: teacherId,
                day_of_week: dayOfWeek,
                period_number: periodNumber,
                is_active: true,
                ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
            }
        });
    }

    async createTimetable(schema: string, payload: Partial<Timetable>, transaction?: Transaction) {
        // NOTE: Cast needed - Sequelize create expects full model attrs
        return Timetable.schema(schema).create(payload as CreationAttributes<Timetable>, { transaction });
    }

    async updateTimetableById(
        schema: string,
        institutionId: string,
        id: string,
        payload: Partial<Timetable>,
        transaction?: Transaction
    ) {
        await Timetable.schema(schema).update(payload, {
            where: {
                id,
                institution_id: institutionId
            },
            transaction
        });

        return this.findTimetableById(schema, institutionId, id);
    }

    async softDeleteTimetableById(schema: string, institutionId: string, id: string, transaction?: Transaction) {
        return Timetable.schema(schema).update(
            { is_active: false },
            {
                where: {
                    id,
                    institution_id: institutionId
                },
                transaction
            }
        );
    }

    async findClassTimetable(
        schema: string,
        institutionId: string,
        classId: string,
        sectionId: string,
        academicYearId: string
    ) {
        return Timetable.schema(schema).findAll({
            where: {
                institution_id: institutionId,
                class_id: classId,
                section_id: sectionId,
                academic_year_id: academicYearId,
                is_active: true
            },
            include: [
                { model: Subject.schema(schema), as: 'subject' },
                { model: User.schema(schema), as: 'teacher', attributes: ['id', 'first_name', 'last_name', 'email'] }
            ],
            order: [['day_of_week', 'ASC'], ['period_number', 'ASC']]
        });
    }

    async findTeacherTimetable(
        schema: string,
        institutionId: string,
        teacherId: string,
        academicYearId: string
    ) {
        return Timetable.schema(schema).findAll({
            where: {
                institution_id: institutionId,
                teacher_id: teacherId,
                academic_year_id: academicYearId,
                is_active: true
            },
            include: [
                { model: Class.schema(schema), as: 'class' },
                { model: Section.schema(schema), as: 'section' },
                { model: Subject.schema(schema), as: 'subject' }
            ],
            order: [['day_of_week', 'ASC'], ['period_number', 'ASC']]
        });
    }
}

export const academicRepository = new AcademicRepository();
