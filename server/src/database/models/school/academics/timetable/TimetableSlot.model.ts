import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';
import { Class } from '../class/Class.model';
import { Section } from '../class/Section.model';
import { Subject } from '../curriculum/Subject.model';
import { AcademicSession } from '../session/AcademicSession.model';
import { Teacher } from '../staff/Teacher.model';

export enum TimetableSlotType {
    REGULAR = 'REGULAR',
    BREAK = 'BREAK',
    ASSEMBLY = 'ASSEMBLY',
    LUNCH = 'LUNCH',
    SPECIAL = 'SPECIAL',
}

export interface TimetableSlotAttributes {
    id: string;
    institution_id: string;
    class_id: string;
    section_id: string;
    subject_id?: string;
    teacher_id?: string;
    session_id: string;
    day_of_week: number;
    slot_number: number;
    slot_type: TimetableSlotType;
    start_time: string;
    end_time: string;
    room_number?: string;
    is_active: boolean;
    effective_from?: Date;
    effective_until?: Date;
    notes?: string;
    metadata?: Record<string, unknown>;
}

@Table({
    tableName: 'timetable_slots',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['institution_id'] },
        { fields: ['class_id', 'section_id'] },
        { fields: ['session_id'] },
        { fields: ['teacher_id'] },
        { fields: ['day_of_week', 'slot_number'] },
        {
            unique: true,
            fields: ['section_id', 'session_id', 'day_of_week', 'slot_number'],
            name: 'unique_section_time_slot',
        },
    ],
})
export class TimetableSlot extends Model implements TimetableSlotAttributes {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Institution)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare institution_id: string;

    @ForeignKey(() => Class)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare class_id: string;

    @ForeignKey(() => Section)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare section_id: string;

    @ForeignKey(() => Subject)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare subject_id?: string;

    @ForeignKey(() => Teacher)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare teacher_id?: string;

    @ForeignKey(() => AcademicSession)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare session_id: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        validate: { min: 0, max: 6 },
    })
    declare day_of_week: number;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare slot_number: number;

    @Default(TimetableSlotType.REGULAR)
    @Column({
        type: DataType.STRING(20),
    })
    declare slot_type: TimetableSlotType;

    @Column({
        type: DataType.STRING(5),
        allowNull: false,
    })
    declare start_time: string;

    @Column({
        type: DataType.STRING(5),
        allowNull: false,
    })
    declare end_time: string;

    @Column({
        type: DataType.STRING(50),
        allowNull: true,
    })
    declare room_number?: string;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
    })
    declare is_active: boolean;

    @Column({
        type: DataType.DATEONLY,
        allowNull: true,
    })
    declare effective_from?: Date;

    @Column({
        type: DataType.DATEONLY,
        allowNull: true,
    })
    declare effective_until?: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare notes?: string;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    declare metadata?: Record<string, unknown>;

    // Associations
    @BelongsTo(() => Institution)
    declare institution?: Institution;

    @BelongsTo(() => Class)
    declare class?: Class;

    @BelongsTo(() => Section)
    declare section?: Section;

    @BelongsTo(() => Subject)
    declare subject?: Subject;

    @BelongsTo(() => Teacher)
    declare teacher?: Teacher;

    @BelongsTo(() => AcademicSession)
    declare session?: AcademicSession;
}

export default TimetableSlot;
