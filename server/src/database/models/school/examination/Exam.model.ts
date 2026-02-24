import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../public/Institution.model';
import { AcademicSession } from '../academics/session/AcademicSession.model';

/**
 * Exam - represents an examination event (Mid-term, Final, Unit Test)
 * School-specific model
 */
@Table({
    tableName: 'exams',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['institution_id', 'name', 'academic_year_id'],
            name: 'exams_unique_per_year',
        },
        {
            fields: ['institution_id', 'academic_year_id'],
            name: 'idx_exams_institution_year',
        },
    ],
})
export class Exam extends Model {
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

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string; // e.g., "Mid-Term Exam 2024", "Unit Test 1"

    @Column(DataType.TEXT)
    code?: string; // e.g., "MID1", "UT1"

    @Column({
        type: DataType.ENUM('MID_TERM', 'FINAL', 'UNIT_TEST', 'QUIZ', 'PRACTICAL', 'ASSIGNMENT'),
        allowNull: false
    })
    type!: string;

    @Column(DataType.DATEONLY)
    start_date?: Date;

    @Column(DataType.DATEONLY)
    end_date?: Date;

    @Default('draft')
    @Column(DataType.TEXT)
    status!: string; // draft, scheduled, ongoing, completed

    @Default(true)
    @Column(DataType.BOOLEAN)
    is_active!: boolean;
}

export default Exam;
