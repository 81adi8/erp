import {
    BelongsTo,
    Column,
    DataType,
    Default,
    ForeignKey,
    Model,
    Table,
} from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { User } from '../../shared/core/User.model';
import { AcademicSession } from '../academics/session/AcademicSession.model';

export const REPORT_TYPES = [
    'student_list',
    'attendance_register',
    'fee_collection',
    'fee_dues',
    'exam_results',
    'exam_toppers',
    'student_strength',
] as const;

export const REPORT_FORMATS = ['excel', 'pdf'] as const;

export const REPORT_JOB_STATUSES = [
    'queued',
    'processing',
    'completed',
    'failed',
] as const;

export type ReportType = typeof REPORT_TYPES[number];
export type ReportFormat = typeof REPORT_FORMATS[number];
export type ReportJobStatus = typeof REPORT_JOB_STATUSES[number];

export interface ReportFilters {
    class_id?: string;
    section_id?: string;
    exam_id?: string;
    month?: number;
    year?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
    gender?: string;
    category?: string;
    payment_mode?: string;
    min_due_amount?: number;
    academic_year_id?: string;
    format?: ReportFormat;
    [key: string]: unknown;
}

@Table({
    tableName: 'report_jobs',
    timestamps: true,
    underscored: true,
    indexes: [
        { name: 'idx_report_jobs_institution_status', fields: ['institution_id', 'status'] },
        { name: 'idx_report_jobs_requested_by', fields: ['requested_by'] },
        { name: 'idx_report_jobs_type_status', fields: ['report_type', 'status'] },
    ],
})
export class ReportJob extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @ForeignKey(() => Institution)
    @Column({ type: DataType.UUID, allowNull: false })
    institution_id!: string;

    @BelongsTo(() => Institution)
    institution?: Institution;

    @ForeignKey(() => AcademicSession)
    @Column({ type: DataType.UUID, allowNull: false })
    academic_year_id!: string;

    @BelongsTo(() => AcademicSession)
    academic_session?: AcademicSession;

    @Column({ type: DataType.ENUM(...REPORT_TYPES), allowNull: false })
    report_type!: ReportType;

    @Column({ type: DataType.ENUM(...REPORT_FORMATS), allowNull: false })
    format!: ReportFormat;

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    filters!: ReportFilters;

    @Default('queued')
    @Column({ type: DataType.ENUM(...REPORT_JOB_STATUSES), allowNull: false })
    status!: ReportJobStatus;

    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    progress!: number;

    @Column({ type: DataType.STRING(1024), allowNull: true })
    file_url?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    file_name?: string;

    @Column({ type: DataType.STRING(1024), allowNull: true })
    error_message?: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    requested_by!: string;

    @BelongsTo(() => User, 'requested_by')
    requester?: User;

    @Column({ type: DataType.DATE, allowNull: true })
    started_at?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    completed_at?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    expires_at?: Date;

    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

export default ReportJob;