import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsEnum, IsNumber, IsArray, MinLength, MaxLength } from 'class-validator';
import { AcademicSessionStatus } from '../../../../database/models/school/academics/session/AcademicSession.model';
import { JsonObject } from './common.dto';

export class CreateAcademicSessionDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(50)
    name!: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    code?: string;

    @IsDateString()
    @IsNotEmpty()
    start_date!: string;

    @IsDateString()
    @IsNotEmpty()
    end_date!: string;

    @IsDateString()
    @IsOptional()
    admission_start_date?: string;

    @IsDateString()
    @IsOptional()
    admission_end_date?: string;

    @IsEnum(AcademicSessionStatus)
    @IsOptional()
    status?: AcademicSessionStatus;

    @IsBoolean()
    @IsOptional()
    is_current?: boolean;

    @IsArray()
    @IsNumber({}, { each: true })
    @IsOptional()
    weekly_off_days?: number[];

    @IsNumber()
    @IsOptional()
    attendance_backdate_days?: number;

    @IsNumber()
    @IsOptional()
    marks_lock_days?: number;

    @IsOptional()
    promotion_rule?: JsonObject;

    @IsOptional()
    result_publish_rules?: JsonObject;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsOptional()
    settings_config?: JsonObject;

    @IsOptional()
    metadata?: JsonObject;
}

export class UpdateAcademicSessionDto {
    @IsString()
    @IsOptional()
    @MinLength(3)
    @MaxLength(50)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    code?: string;

    @IsDateString()
    @IsOptional()
    start_date?: string;

    @IsDateString()
    @IsOptional()
    end_date?: string;

    @IsDateString()
    @IsOptional()
    admission_start_date?: string;

    @IsDateString()
    @IsOptional()
    admission_end_date?: string;

    @IsEnum(AcademicSessionStatus)
    @IsOptional()
    status?: AcademicSessionStatus;

    @IsBoolean()
    @IsOptional()
    is_current?: boolean;

    @IsArray()
    @IsNumber({}, { each: true })
    @IsOptional()
    weekly_off_days?: number[];

    @IsNumber()
    @IsOptional()
    attendance_backdate_days?: number;

    @IsNumber()
    @IsOptional()
    marks_lock_days?: number;

    @IsOptional()
    promotion_rule?: JsonObject;

    @IsOptional()
    result_publish_rules?: JsonObject;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsOptional()
    settings_config?: JsonObject;

    @IsOptional()
    metadata?: JsonObject;
}

export class CreateAcademicTermDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsDateString()
    @IsNotEmpty()
    start_date!: string;

    @IsDateString()
    @IsNotEmpty()
    end_date!: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsNumber()
    @IsOptional()
    display_order?: number;

    @IsNumber()
    @IsOptional()
    weightage?: number;

    @IsOptional()
    metadata?: JsonObject;
}

export class UpdateAcademicTermDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsDateString()
    @IsOptional()
    start_date?: string;

    @IsDateString()
    @IsOptional()
    end_date?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsNumber()
    @IsOptional()
    display_order?: number;

    @IsNumber()
    @IsOptional()
    weightage?: number;

    @IsOptional()
    metadata?: JsonObject;
}

export class CreateSessionHolidayDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsDateString()
    @IsNotEmpty()
    start_date!: string;

    @IsDateString()
    @IsNotEmpty()
    end_date!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_gazetted?: boolean;

    @IsString()
    @IsOptional()
    holiday_type?: string;

    @IsOptional()
    metadata?: JsonObject;
}

export class UpdateSessionHolidayDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsDateString()
    @IsOptional()
    start_date?: string;

    @IsDateString()
    @IsOptional()
    end_date?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsBoolean()
    @IsOptional()
    is_gazetted?: boolean;

    @IsString()
    @IsOptional()
    holiday_type?: string;

    @IsOptional()
    metadata?: JsonObject;
}

export class CreateMasterHolidayDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsNumber()
    @IsNotEmpty()
    month!: number;

    @IsNumber()
    @IsNotEmpty()
    day!: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_gazetted?: boolean;

    @IsString()
    @IsOptional()
    holiday_type?: string;

    @IsOptional()
    metadata?: JsonObject;
}

export class UpdateMasterHolidayDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @IsOptional()
    month?: number;

    @IsNumber()
    @IsOptional()
    day?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_gazetted?: boolean;

    @IsString()
    @IsOptional()
    holiday_type?: string;

    @IsOptional()
    metadata?: JsonObject;
}
