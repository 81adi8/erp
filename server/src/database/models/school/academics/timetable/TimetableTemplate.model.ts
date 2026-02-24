import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Institution } from '../../../public/Institution.model';

export interface TimetableTemplateAttributes {
    id: string;
    institution_id: string;
    name: string;
    code?: string;
    description?: string;
    total_slots_per_day: number;
    start_time: string;
    slot_duration_minutes: number;
    break_slots: number[];
    lunch_slot?: number;
    is_default: boolean;
    is_active: boolean;
    slot_config?: {
        lunch_after_slot?: number;
        break_after_slots?: number[];
        [key: string]: any;
    };
    generation_rules?: {
        max_consecutive_hours_teacher?: number;
        max_periods_per_subject_per_day?: number;
        allow_double_periods?: boolean;
        balance_subject_distribution?: boolean;
        [key: string]: any;
    };
    metadata?: Record<string, unknown>;
}

@Table({
    tableName: 'timetable_templates',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['institution_id'] },
        { 
            unique: true, 
            fields: ['institution_id', 'code'], 
            name: 'unique_template_code' 
        },
    ],
})
export class TimetableTemplate extends Model implements TimetableTemplateAttributes {
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

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.STRING(20),
        allowNull: true,
    })
    declare code?: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare description?: string;

    @Default(8)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare total_slots_per_day: number;

    @Default('08:00')
    @Column({
        type: DataType.STRING(5),
        allowNull: false,
    })
    declare start_time: string;

    @Default(45)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare slot_duration_minutes: number;

    @Default([])
    @Column({
        type: DataType.ARRAY(DataType.INTEGER),
        allowNull: false,
    })
    declare break_slots: number[];

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare lunch_slot?: number;

    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
    })
    declare is_default: boolean;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
    })
    declare is_active: boolean;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    declare slot_config?: {
        lunch_after_slot?: number;
        break_after_slots?: number[];
        [key: string]: any;
    };

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    declare generation_rules?: {
        max_consecutive_hours_teacher?: number;
        max_periods_per_subject_per_day?: number;
        allow_double_periods?: boolean;
        balance_subject_distribution?: boolean;
        [key: string]: any;
    };

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    declare metadata?: Record<string, unknown>;

    // Associations
    @BelongsTo(() => Institution)
    declare institution?: Institution;
}

export default TimetableTemplate;
