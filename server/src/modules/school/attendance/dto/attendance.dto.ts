// ============================================================================
// ATTENDANCE MODULE - DTOs (Data Transfer Objects)
// ============================================================================

import { 
    IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, IsDate, IsBoolean, 
    IsInt, Min, Max, IsArray, ValidateNested, MaxLength, IsDateString,
    ArrayMinSize, ArrayMaxSize
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { 
    AttendanceStatus, AttendanceScope, AttendanceMode, 
    LeaveType, LeaveStatus, NotificationChannel 
} from '../types/attendance.types';
import { ATTENDANCE_LIMITS } from '../constants/attendance.constants';

// ============================================================================
// COMMON DTOs
// ============================================================================

export class PaginationQueryDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Transform(({ value }) => parseInt(value, 10))
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(ATTENDANCE_LIMITS.MAX_PAGE_SIZE)
    @Transform(({ value }) => parseInt(value, 10))
    limit?: number = ATTENDANCE_LIMITS.DEFAULT_PAGE_SIZE;

    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsEnum(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';

    @IsOptional()
    @IsString()
    search?: string;
}

// ============================================================================
// ATTENDANCE MARKING DTOs
// ============================================================================

export class MarkAttendanceDto {
    @IsUUID()
    @IsNotEmpty()
    entityId!: string;

    @IsEnum(AttendanceStatus)
    @IsNotEmpty()
    status!: AttendanceStatus;

    @IsDateString()
    @IsNotEmpty()
    date!: string;

    @IsOptional()
    @IsString()
    @MaxLength(ATTENDANCE_LIMITS.MAX_REMARK_LENGTH)
    remark?: string;

    @IsOptional()
    @IsString()
    checkInTime?: string;  // HH:mm format

    @IsOptional()
    @IsString()
    checkOutTime?: string; // HH:mm format

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(12)
    periodNumber?: number;
}

export class BulkMarkAttendanceDto {
    @IsEnum(AttendanceScope)
    @IsNotEmpty()
    scope!: AttendanceScope;

    @IsDateString()
    @IsNotEmpty()
    date!: string;

    @IsOptional()
    @IsUUID()
    classId?: string;

    @IsOptional()
    @IsUUID()
    sectionId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttendanceEntryDto)
    @ArrayMinSize(1)
    @ArrayMaxSize(ATTENDANCE_LIMITS.MAX_BULK_MARK_COUNT)
    entries!: AttendanceEntryDto[];
}

export class AttendanceEntryDto {
    @IsUUID()
    @IsNotEmpty()
    entityId!: string;

    @IsEnum(AttendanceStatus)
    @IsNotEmpty()
    status!: AttendanceStatus;

    @IsOptional()
    @IsString()
    @MaxLength(ATTENDANCE_LIMITS.MAX_REMARK_LENGTH)
    remark?: string;

    @IsOptional()
    @IsString()
    checkInTime?: string;

    @IsOptional()
    @IsString()
    checkOutTime?: string;
}

export class UpdateAttendanceDto {
    @IsEnum(AttendanceStatus)
    @IsOptional()
    status?: AttendanceStatus;

    @IsOptional()
    @IsString()
    @MaxLength(ATTENDANCE_LIMITS.MAX_REMARK_LENGTH)
    remark?: string;

    @IsOptional()
    @IsString()
    checkInTime?: string;

    @IsOptional()
    @IsString()
    checkOutTime?: string;

    @IsOptional()
    @IsString()
    @MaxLength(ATTENDANCE_LIMITS.MAX_REMARK_LENGTH)
    editReason?: string; // Required reason for edit
}

// ============================================================================
// ATTENDANCE QUERY DTOs
// ============================================================================

export class AttendanceQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsEnum(AttendanceScope)
    scope?: AttendanceScope;

    @IsOptional()
    @IsUUID()
    entityId?: string;

    @IsOptional()
    @IsUUID()
    classId?: string;

    @IsOptional()
    @IsUUID()
    sectionId?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    isLocked?: boolean;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    unmarkedOnly?: boolean;
}

export class DailyAttendanceQueryDto {
    @IsDateString()
    @IsNotEmpty()
    date!: string;

    @IsOptional()
    @IsUUID()
    classId?: string;

    @IsOptional()
    @IsUUID()
    sectionId?: string;
}

// ============================================================================
// LEAVE DTOs
// ============================================================================

export class ApplyLeaveDto {
    @IsEnum(AttendanceScope)
    @IsNotEmpty()
    scope!: AttendanceScope;

    @IsUUID()
    @IsNotEmpty()
    entityId!: string;

    @IsEnum(LeaveType)
    @IsNotEmpty()
    leaveType!: LeaveType;

    @IsDateString()
    @IsNotEmpty()
    startDate!: string;

    @IsDateString()
    @IsNotEmpty()
    endDate!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(ATTENDANCE_LIMITS.MAX_REMARK_LENGTH)
    reason!: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    attachmentUrls?: string[];
}

export class ApproveLeaveDto {
    @IsOptional()
    @IsString()
    @MaxLength(ATTENDANCE_LIMITS.MAX_REMARK_LENGTH)
    approvalNote?: string;

    @IsOptional()
    @IsBoolean()
    markAsExcused?: boolean;
}

export class RejectLeaveDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(ATTENDANCE_LIMITS.MAX_REJECTION_REASON_LENGTH)
    rejectionReason!: string;
}

export class LeaveQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsEnum(AttendanceScope)
    scope?: AttendanceScope;

    @IsOptional()
    @IsUUID()
    entityId?: string;

    @IsOptional()
    @IsUUID()
    classId?: string;

    @IsOptional()
    @IsEnum(LeaveStatus)
    status?: LeaveStatus;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}

// ============================================================================
// SETTINGS DTOs
// ============================================================================

export class AttendanceRulesDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(120)
    lateThresholdMinutes?: number;

    @IsOptional()
    @IsInt()
    @Min(30)
    @Max(240)
    halfDayThresholdMinutes?: number;

    @IsOptional()
    @IsInt()
    @Min(60)
    @Max(480)
    absentThresholdMinutes?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(72)
    lockAfterHours?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(24)
    editWindowHours?: number;

    @IsOptional()
    @IsBoolean()
    requireApprovalForEdit?: boolean;

    @IsOptional()
    @IsBoolean()
    requireReasonForAbsent?: boolean;

    @IsOptional()
    @IsBoolean()
    autoMarkLeaveAsExcused?: boolean;

    @IsOptional()
    @IsInt()
    @Min(ATTENDANCE_LIMITS.MIN_ATTENDANCE_PERCENTAGE)
    @Max(ATTENDANCE_LIMITS.MAX_ATTENDANCE_PERCENTAGE)
    minimumAttendancePercent?: number;
}

export class CreateAttendanceSettingsDto {
    @IsEnum(AttendanceScope)
    @IsNotEmpty()
    scope!: AttendanceScope;

    @IsOptional()
    @IsUUID()
    classId?: string; // null = global settings

    @IsEnum(AttendanceMode)
    @IsOptional()
    mode?: AttendanceMode;

    @IsOptional()
    @IsString()
    defaultStartTime?: string;

    @IsOptional()
    @IsString()
    defaultEndTime?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AttendanceRulesDto)
    rules?: AttendanceRulesDto;

    @IsOptional()
    @IsBoolean()
    allowBackdatedMarking?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(ATTENDANCE_LIMITS.MAX_BACKDATED_DAYS)
    backdatedDaysLimit?: number;

    @IsOptional()
    @IsBoolean()
    showToParents?: boolean;

    @IsOptional()
    @IsBoolean()
    showToStudents?: boolean;

    @IsOptional()
    @IsBoolean()
    autoNotifyParentOnAbsent?: boolean;

    @IsOptional()
    @IsArray()
    @IsEnum(NotificationChannel, { each: true })
    notificationChannels?: NotificationChannel[];

    @IsOptional()
    @IsInt()
    @Min(ATTENDANCE_LIMITS.MIN_WORKING_DAYS)
    @Max(ATTENDANCE_LIMITS.MAX_WORKING_DAYS)
    workingDaysInWeek?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(365)
    leaveQuotaPerYear?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateAttendanceSettingsDto {
    @IsOptional()
    @IsEnum(AttendanceScope)
    scope?: AttendanceScope;

    @IsOptional()
    @IsUUID()
    classId?: string;

    @IsEnum(AttendanceMode)
    @IsOptional()
    mode?: AttendanceMode;

    @IsOptional()
    @IsString()
    defaultStartTime?: string;

    @IsOptional()
    @IsString()
    defaultEndTime?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AttendanceRulesDto)
    rules?: AttendanceRulesDto;

    @IsOptional()
    @IsBoolean()
    allowBackdatedMarking?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(ATTENDANCE_LIMITS.MAX_BACKDATED_DAYS)
    backdatedDaysLimit?: number;

    @IsOptional()
    @IsBoolean()
    showToParents?: boolean;

    @IsOptional()
    @IsBoolean()
    showToStudents?: boolean;

    @IsOptional()
    @IsBoolean()
    autoNotifyParentOnAbsent?: boolean;

    @IsOptional()
    @IsArray()
    @IsEnum(NotificationChannel, { each: true })
    notificationChannels?: NotificationChannel[];

    @IsOptional()
    @IsInt()
    @Min(ATTENDANCE_LIMITS.MIN_WORKING_DAYS)
    @Max(ATTENDANCE_LIMITS.MAX_WORKING_DAYS)
    workingDaysInWeek?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(365)
    leaveQuotaPerYear?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

// ============================================================================
// REPORT DTOs
// ============================================================================

export class AttendanceReportQueryDto {
    @IsEnum(AttendanceScope)
    @IsNotEmpty()
    scope!: AttendanceScope;

    @IsOptional()
    @IsUUID()
    classId?: string;

    @IsOptional()
    @IsUUID()
    sectionId?: string;

    @IsDateString()
    @IsNotEmpty()
    startDate!: string;

    @IsDateString()
    @IsNotEmpty()
    endDate!: string;

    @IsOptional()
    @IsEnum(['day', 'week', 'month'])
    groupBy?: 'day' | 'week' | 'month';

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    includeDetails?: boolean;
}

export class ExportReportDto {
    @IsEnum(['pdf', 'excel', 'csv'])
    @IsNotEmpty()
    format!: 'pdf' | 'excel' | 'csv';

    @IsEnum(AttendanceScope)
    @IsNotEmpty()
    scope!: AttendanceScope;

    @IsDateString()
    @IsNotEmpty()
    startDate!: string;

    @IsDateString()
    @IsNotEmpty()
    endDate!: string;

    @IsOptional()
    @IsUUID()
    classId?: string;

    @IsOptional()
    @IsUUID()
    sectionId?: string;
}

// ============================================================================
// LOCK DTOs
// ============================================================================

export class LockAttendanceDto {
    @IsEnum(AttendanceScope)
    @IsNotEmpty()
    scope!: AttendanceScope;

    @IsDateString()
    @IsNotEmpty()
    date!: string;

    @IsOptional()
    @IsUUID()
    classId?: string;

    @IsOptional()
    @IsUUID()
    sectionId?: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
