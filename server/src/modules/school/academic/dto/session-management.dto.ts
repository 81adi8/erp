import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsEnum, IsUUID, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PromotionDecision } from '../../../../database/models/school/academics/student/PromotionHistory.model';
import { LockTarget } from '../../../../database/models/school/academics/session/SessionLockLog.model';

export class LockSessionDto {
    @IsBoolean()
    @IsOptional()
    lockAttendance?: boolean;

    @IsBoolean()
    @IsOptional()
    lockMarks?: boolean;

    @IsBoolean()
    @IsOptional()
    lockFees?: boolean;

    @IsBoolean()
    @IsOptional()
    lockEnrollment?: boolean;

    @IsString()
    @IsOptional()
    reason?: string;
}

export class PromotionDecisionDto {
    @IsUUID()
    @IsNotEmpty()
    enrollmentId!: string;

    @IsEnum(PromotionDecision)
    @IsNotEmpty()
    decision!: PromotionDecision;

    @IsUUID()
    @IsOptional()
    toClassId?: string;

    @IsUUID()
    @IsOptional()
    toSectionId?: string;

    @IsNumber()
    @IsOptional()
    percentage?: number;

    @IsString()
    @IsOptional()
    grade?: string;

    @IsString()
    @IsOptional()
    remarks?: string;
}

export class BulkPromotionDto {
    @IsUUID()
    @IsNotEmpty()
    fromSessionId!: string;

    @IsUUID()
    @IsNotEmpty()
    toSessionId!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PromotionDecisionDto)
    decisions!: PromotionDecisionDto[];
}

export class CreateNextSessionDto {
    @IsUUID()
    @IsNotEmpty()
    currentSessionId!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsNotEmpty()
    start_date!: string;

    @IsString()
    @IsNotEmpty()
    end_date!: string;
}
