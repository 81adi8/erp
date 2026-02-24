import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min, Max, IsEnum, IsDateString, MinLength, MaxLength, IsArray } from 'class-validator';
import { JsonObject } from './common.dto';

export enum LessonPlanStatus {
    PLANNED = 'PLANNED',
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export class CreateLessonPlanDto {
    @IsUUID()
    @IsNotEmpty()
    topic_id!: string;

    @IsUUID()
    @IsNotEmpty()
    class_id!: string;

    @IsUUID()
    @IsNotEmpty()
    section_id!: string;

    @IsUUID()
    @IsOptional()
    teacher_id?: string;

    @IsDateString()
    @IsNotEmpty()
    planned_date!: string;

    @IsString()
    @IsOptional()
    remarks?: string;

    @IsEnum(LessonPlanStatus)
    @IsOptional()
    status?: LessonPlanStatus;

    @IsString()
    @IsOptional()
    aims_objectives?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    teaching_aids?: string[];

    @IsString()
    @IsOptional()
    homework_assignment?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    attachment_urls?: string[];

    @IsOptional()
    metadata?: JsonObject;
}

export class UpdateLessonPlanDto {
    @IsDateString()
    @IsOptional()
    planned_date?: string;

    @IsDateString()
    @IsOptional()
    completion_date?: string;

    @IsString()
    @IsOptional()
    remarks?: string;

    @IsEnum(LessonPlanStatus)
    @IsOptional()
    status?: LessonPlanStatus;

    @IsUUID()
    @IsOptional()
    teacher_id?: string | null;

    @IsString()
    @IsOptional()
    aims_objectives?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    teaching_aids?: string[];

    @IsString()
    @IsOptional()
    homework_assignment?: string;

    @IsString()
    @IsOptional()
    student_feedback?: string;

    @IsString()
    @IsOptional()
    coordinator_remarks?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    attachment_urls?: string[];

    @IsOptional()
    metadata?: JsonObject;
}

export class LessonPlanFilterDto {
    @IsUUID()
    @IsOptional()
    class_id?: string;

    @IsUUID()
    @IsOptional()
    section_id?: string;

    @IsUUID()
    @IsOptional()
    subject_id?: string;

    @IsUUID()
    @IsOptional()
    teacher_id?: string;

    @IsEnum(LessonPlanStatus)
    @IsOptional()
    status?: LessonPlanStatus;

    @IsDateString()
    @IsOptional()
    from_date?: string;

    @IsDateString()
    @IsOptional()
    to_date?: string;
}
