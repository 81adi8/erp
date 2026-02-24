import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsUUID, IsInt, Min, Max, MinLength, MaxLength, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum SubjectType {
    CORE = 'CORE',
    ELECTIVE = 'ELECTIVE',
    LANGUAGE = 'LANGUAGE',
    VOCATIONAL = 'VOCATIONAL'
}

export class CreateSubjectDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(100)
    name!: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    code?: string;

    @IsEnum(SubjectType)
    @IsOptional()
    subject_type?: SubjectType;

    @IsBoolean()
    @IsOptional()
    is_practical?: boolean;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    credit_hours?: number;

    @IsString()
    @IsOptional()
    color_code?: string;

    @IsString()
    @IsOptional()
    icon_name?: string;

    @IsBoolean()
    @IsOptional()
    is_compulsory?: boolean;

    @IsOptional()
    assessment_weights?: Record<string, unknown>;

    @IsOptional()
    metadata?: Record<string, unknown>;
}

export class UpdateSubjectDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    code?: string;

    @IsEnum(SubjectType)
    @IsOptional()
    subject_type?: SubjectType;

    @IsBoolean()
    @IsOptional()
    is_practical?: boolean;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    credit_hours?: number;

    @IsString()
    @IsOptional()
    color_code?: string;

    @IsString()
    @IsOptional()
    icon_name?: string;

    @IsBoolean()
    @IsOptional()
    is_compulsory?: boolean;

    @IsOptional()
    assessment_weights?: Record<string, unknown>;

    @IsOptional()
    metadata?: Record<string, unknown>;
}

/**
 * Fixed slot for scheduling - specific day and period
 */
export class FixedSlotDto {
    @IsInt()
    @Min(0)
    @Max(6)
    day!: number;

    @IsInt()
    @Min(1)
    @Max(12)
    slot!: number;
}

/**
 * Scheduling preferences for intelligent timetable generation
 */
export class SchedulingPreferencesDto {
    /**
     * Preferred days of the week (0=Sunday, 1=Monday, ..., 6=Saturday)
     */
    @IsArray()
    @IsInt({ each: true })
    @IsOptional()
    preferred_days?: number[];

    /**
     * Days to avoid for this subject
     */
    @IsArray()
    @IsInt({ each: true })
    @IsOptional()
    avoid_days?: number[];

    /**
     * Preferred slot positions: 'first', 'last', 'morning', 'afternoon', or specific numbers
     */
    @IsArray()
    @IsOptional()
    preferred_slots?: (string | number)[];

    /**
     * Slots to avoid
     */
    @IsArray()
    @IsInt({ each: true })
    @IsOptional()
    avoid_slots?: number[];

    /**
     * Whether to schedule as consecutive periods (double period)
     */
    @IsBoolean()
    @IsOptional()
    prefer_consecutive?: boolean;

    /**
     * Minimum gap between two instances on the same day
     */
    @IsInt()
    @IsOptional()
    @Min(0)
    @Max(6)
    min_gap_same_day?: number;

    /**
     * Priority level (1-10, higher = more important)
     */
    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(10)
    priority?: number;

    /**
     * Required room type (e.g., 'science_lab', 'computer_lab')
     */
    @IsString()
    @IsOptional()
    required_room_type?: string;

    /**
     * Fixed slots - subject MUST be placed at these positions
     */
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FixedSlotDto)
    @IsOptional()
    fixed_slots?: FixedSlotDto[];

    /**
     * Whether to spread evenly across the week
     */
    @IsBoolean()
    @IsOptional()
    spread_evenly?: boolean;
}

// Class-Subject Assignment DTOs
export class AssignSubjectToClassDto {
    @IsUUID()
    @IsNotEmpty()
    subject_id!: string;

    @IsUUID()
    @IsOptional()
    teacher_id?: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(12)
    periods_per_week?: number;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(6)
    max_periods_per_day?: number;

    @IsInt()
    @IsOptional()
    @Min(1)
    min_periods_per_week?: number;

    @IsBoolean()
    @IsOptional()
    is_elective?: boolean;

    @IsBoolean()
    @IsOptional()
    requires_special_room?: boolean;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    special_room_type?: string;

    @IsInt()
    @IsOptional()
    max_marks?: number;

    @IsInt()
    @IsOptional()
    passing_marks?: number;

    /**
     * Scheduling preferences for timetable generation
     */
    @ValidateNested()
    @Type(() => SchedulingPreferencesDto)
    @IsOptional()
    scheduling_preferences?: SchedulingPreferencesDto;

    @IsOptional()
    metadata?: Record<string, unknown>;
}

export class UpdateClassSubjectDto {
    @IsUUID()
    @IsOptional()
    teacher_id?: string | null;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(12)
    periods_per_week?: number;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(6)
    max_periods_per_day?: number;

    @IsInt()
    @IsOptional()
    @Min(1)
    min_periods_per_week?: number;

    @IsBoolean()
    @IsOptional()
    is_elective?: boolean;

    @IsBoolean()
    @IsOptional()
    requires_special_room?: boolean;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    special_room_type?: string;

    @IsInt()
    @IsOptional()
    max_marks?: number;

    @IsInt()
    @IsOptional()
    passing_marks?: number;

    /**
     * Scheduling preferences for timetable generation
     */
    @ValidateNested()
    @Type(() => SchedulingPreferencesDto)
    @IsOptional()
    scheduling_preferences?: SchedulingPreferencesDto;

    @IsOptional()
    metadata?: Record<string, unknown>;
}
