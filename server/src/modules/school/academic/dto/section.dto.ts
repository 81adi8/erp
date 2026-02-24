import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsUUID, MinLength, MaxLength, IsEnum } from 'class-validator';
import { JsonObject } from './common.dto';

export enum AttendanceMode {
    DAILY = 'DAILY',
    PERIOD_WISE = 'PERIOD_WISE'
}

export class CreateSectionDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(20)
    name!: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(200)
    capacity?: number;

    @IsUUID()
    @IsOptional()
    class_teacher_id?: string;

    @IsString()
    @IsOptional()
    room_number?: string;

    @IsString()
    @IsOptional()
    floor?: string;

    @IsString()
    @IsOptional()
    wing?: string;

    @IsEnum(AttendanceMode)
    @IsOptional()
    attendance_mode?: AttendanceMode;

    @IsOptional()
    metadata?: JsonObject;
}

export class UpdateSectionDto {
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(20)
    name?: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(200)
    capacity?: number;

    @IsUUID()
    @IsOptional()
    class_teacher_id?: string | null;

    @IsString()
    @IsOptional()
    room_number?: string;

    @IsString()
    @IsOptional()
    floor?: string;

    @IsString()
    @IsOptional()
    wing?: string;

    @IsEnum(AttendanceMode)
    @IsOptional()
    attendance_mode?: AttendanceMode;

    @IsOptional()
    metadata?: JsonObject;
}
