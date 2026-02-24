import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { AcademicSession } from '../session/AcademicSession.model';
import { Class } from '../class/Class.model';
import { Section } from '../class/Section.model';
import { Subject } from './Subject.model';
import { Teacher } from '../staff/Teacher.model';
import { Topic } from './Topic.model';

/**
 * LessonPlan status enum for type-safe status comparisons
 */
export enum LessonPlanStatus {
    PLANNED = 'PLANNED',
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

/**
 * LessonPlan model - tracks the teaching progress
 */
@Table({ tableName: 'lesson_plans', timestamps: true, underscored: true })
export class LessonPlan extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    @ForeignKey(() => AcademicSession)
    @Column({ type: DataType.UUID, allowNull: false })
    academic_year_id!: string;

    @BelongsTo(() => AcademicSession)
    academic_session!: AcademicSession;

    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: false })
    class_id!: string;

    @BelongsTo(() => Class)
    class!: Class;

    @ForeignKey(() => Section)
    @Column({ type: DataType.UUID, allowNull: false })
    section_id!: string;

    @BelongsTo(() => Section)
    section!: Section;

    @ForeignKey(() => Subject)
    @Column({ type: DataType.UUID, allowNull: false })
    subject_id!: string;

    @BelongsTo(() => Subject)
    subject!: Subject;

    @ForeignKey(() => Teacher)
    @Column({ type: DataType.UUID, allowNull: false })
    teacher_id!: string;

    @BelongsTo(() => Teacher)
    teacher!: Teacher;

    @ForeignKey(() => Topic)
    @Column({ type: DataType.UUID, allowNull: false })
    topic_id!: string;

    @BelongsTo(() => Topic)
    topic!: Topic;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    planned_date!: Date;

    @Column(DataType.DATEONLY)
    completion_date?: Date;

    @Default('PLANNED')
    @Column(DataType.ENUM('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'))
    status!: string;

    @Column(DataType.TEXT)
    remarks?: string;

    @Column(DataType.TEXT)
    aims_objectives?: string;

    @Default({})
    @Column(DataType.JSONB)
    teaching_aids!: string[];

    @Column(DataType.TEXT)
    homework_assignment?: string;

    @Column(DataType.TEXT)
    student_feedback?: string;

    @Column(DataType.TEXT)
    coordinator_remarks?: string;

    @Default({})
    @Column(DataType.JSONB)
    attachment_urls!: string[];

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default LessonPlan;
