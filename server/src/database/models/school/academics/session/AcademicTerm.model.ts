import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { AcademicSession } from './AcademicSession.model';
import { Institution } from '../../../public/Institution.model';

export enum AcademicTermStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    LOCKED = 'LOCKED'
}

@Table({ tableName: 'academic_terms', timestamps: true, underscored: true })
export class AcademicTerm extends Model {
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
    session_id!: string;

    @BelongsTo(() => AcademicSession)
    session!: AcademicSession;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    start_date!: Date;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    end_date!: Date;

    @Default(AcademicTermStatus.DRAFT)
    @Column({
        type: DataType.ENUM(...Object.values(AcademicTermStatus)),
        allowNull: false
    })
    status!: AcademicTermStatus;

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;

    @Default(1)
    @Column(DataType.INTEGER)
    display_order!: number;

    @Column(DataType.TEXT)
    code?: string; // e.g., "T1", "SEM1"

    @Column(DataType.DECIMAL(5, 2))
    weightage?: number; // for result calculation

    // ========== TERM LOCKING ==========
    @Default(false)
    @Column(DataType.BOOLEAN)
    is_locked!: boolean;

    @Column(DataType.DATE)
    locked_at?: Date;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_marks_locked!: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    is_attendance_locked!: boolean;

    @Default({})
    @Column(DataType.JSONB)
    metadata!: any;
}

export default AcademicTerm;
