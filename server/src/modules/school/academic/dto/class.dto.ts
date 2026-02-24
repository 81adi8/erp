import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, MinLength, MaxLength, IsEnum } from 'class-validator';
import { JsonObject } from './common.dto';

export enum ClassCategory {
    PRE_PRIMARY = 'PRE_PRIMARY',
    PRIMARY = 'PRIMARY',
    MIDDLE = 'MIDDLE',
    SECONDARY = 'SECONDARY',
    HIGHER_SECONDARY = 'HIGHER_SECONDARY',
    DIPLOMA = 'DIPLOMA',
    GRADUATE = 'GRADUATE',
    POST_GRADUATE = 'POST_GRADUATE'
}

export class CreateClassDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(50)
    name!: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    code?: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(20)
    numeric_grade?: number;

    @IsEnum(ClassCategory)
    @IsOptional()
    category?: ClassCategory;

    @IsString()
    @IsOptional()
    language_of_instruction?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    display_order?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsOptional()
    metadata?: JsonObject;
}

export class UpdateClassDto {
    @IsString()
    @IsOptional()
    @MinLength(1)
    @MaxLength(50)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    code?: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(20)
    numeric_grade?: number;

    @IsEnum(ClassCategory)
    @IsOptional()
    category?: ClassCategory;

    @IsString()
    @IsOptional()
    language_of_instruction?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    display_order?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsOptional()
    metadata?: JsonObject;
}
