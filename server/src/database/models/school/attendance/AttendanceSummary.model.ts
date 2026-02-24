// ============================================================================
// ATTENDANCE SUMMARY MODEL
// Pre-aggregated attendance data for fast reporting
// ============================================================================
//
// PURPOSE:
// - Avoid querying millions of raw attendance records for reports
// - Pre-computed daily/monthly summaries updated via triggers or batch jobs
// - Enables instant dashboard loading and report generation
//
// UPDATE STRATEGY:
// - Option 1: Database triggers on INSERT/UPDATE/DELETE of student_attendance
// - Option 2: Batch job runs nightly to recalculate previous day
// - Option 3: Real-time update via application service after bulk operations
// ============================================================================

import { 
    Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, Index
} from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { AcademicSession } from '../academics/session/AcademicSession.model';
import { Class } from '../academics/class/Class.model';
import { Section } from '../academics/class/Section.model';
import { SummaryPeriodType, SummaryScope } from '../../../../modules/school/attendance/types';



@Table({ 
    tableName: 'attendance_summaries', 
    timestamps: true, 
    underscored: true,
    indexes: [
        // Primary lookup: Get summary for a scope/period
        { 
            unique: true,
            name: 'uq_attendance_summary',
            fields: ['institution_id', 'academic_year_id', 'scope', 'entity_id', 'period_type', 'period_start'] 
        },
        
        // Dashboard: Get all section summaries for today
        { 
            name: 'idx_summary_dashboard',
            fields: ['academic_year_id', 'scope', 'period_type', 'period_start'] 
        },
        
        // Student report card
        { 
            name: 'idx_summary_student_report',
            fields: ['academic_year_id', 'entity_id', 'period_type'] 
        },
        
        // Class comparison
        { 
            name: 'idx_summary_class_compare',
            fields: ['academic_year_id', 'scope', 'class_id', 'period_type', 'period_start'] 
        }
    ]
})
export class AttendanceSummary extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    // ==================== TENANT ISOLATION ====================
    @ForeignKey(() => Institution)
    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    institutionId!: string;

    @BelongsTo(() => Institution)
    institution!: Institution;

    // ==================== ACADEMIC CONTEXT ====================
    @ForeignKey(() => AcademicSession)
    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    academicYearId!: string;

    @BelongsTo(() => AcademicSession)
    academic_session!: AcademicSession;

    // ==================== SCOPE & ENTITY ====================
    @Column({
        type: DataType.ENUM(...(Object.values(SummaryScope) as string[])),
        allowNull: false
    })
    scope!: SummaryScope;

    // Entity ID based on scope:
    // - STUDENT: student_id
    // - SECTION: section_id
    // - CLASS: class_id
    // - INSTITUTION: institution_id
    @Index
    @Column({ type: DataType.UUID, allowNull: false })
    entityId!: string;

    // Optional class reference for filtering
    @ForeignKey(() => Class)
    @Column({ type: DataType.UUID, allowNull: true })
    classId?: string;

    @BelongsTo(() => Class)
    class?: Class;

    // Optional section reference for filtering
    @ForeignKey(() => Section)
    @Column({ type: DataType.UUID, allowNull: true })
    sectionId?: string;

    @BelongsTo(() => Section)
    section?: Section;

    // ==================== PERIOD DEFINITION ====================
    @Column({
        type: DataType.ENUM(...(Object.values(SummaryPeriodType) as string[])),
        allowNull: false
    })
    periodType!: SummaryPeriodType;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    periodStart!: Date;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    periodEnd!: Date;

    // ==================== AGGREGATED COUNTS ====================
    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    totalWorkingDays!: number;

    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    totalStudents!: number; // For section/class/institution scope

    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    presentCount!: number;

    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    absentCount!: number;

    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    lateCount!: number;

    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    halfDayCount!: number;

    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    leaveCount!: number;

    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    excusedCount!: number;

    // ==================== COMPUTED METRICS ====================
    // Percentage = (present + late*0.75 + half_day*0.5 + excused) / totalWorkingDays * 100
    @Default(0)
    @Column({ type: DataType.DECIMAL(5, 2), allowNull: false })
    attendancePercentage!: number;

    // Weighted count = present*1 + late*0.75 + half_day*0.5 + excused*1
    @Default(0)
    @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
    weightedAttendance!: number;

    // ==================== METADATA ====================
    @Column({ type: DataType.DATE, allowNull: false })
    lastCalculatedAt!: Date;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    needsRecalculation!: boolean;

    // ==================== HELPER METHODS ====================
    
    /**
     * Calculate attendance percentage
     */
    calculatePercentage(): number {
        if (this.totalWorkingDays === 0) return 0;
        
        const weighted = 
            this.presentCount * 1 +
            this.lateCount * 0.75 +
            this.halfDayCount * 0.5 +
            this.excusedCount * 1;
        
        return Math.round((weighted / this.totalWorkingDays) * 10000) / 100;
    }

    /**
     * Recalculate from raw data
     */
    static async recalculateForEntity(
        schemaName: string,
        institutionId: string,
        academicYearId: string,
        scope: SummaryScope,
        entityId: string,
        periodType: SummaryPeriodType,
        periodStart: Date,
        periodEnd: Date
    ): Promise<AttendanceSummary> {
        // This would be implemented to aggregate from student_attendance table
        // For now, return structure - actual implementation depends on query needs
        const [summary] = await AttendanceSummary.schema(schemaName).upsert({
            institutionId: institutionId,
            academicYearId: academicYearId,
            scope,
            entityId: entityId,
            periodType: periodType,
            periodStart: periodStart,
            periodEnd: periodEnd,
            lastCalculatedAt: new Date(),
            needsRecalculation: false
        });

        return summary;
    }
}

export default AttendanceSummary;
