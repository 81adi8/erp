import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min, MinLength, MaxLength, IsNumber, IsArray } from 'class-validator';
import { JsonObject, JsonValue } from './common.dto';

// Chapter DTOs
export class CreateChapterDto {
    @IsUUID()
    @IsNotEmpty()
    subject_id!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(200)
    name!: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    chapter_number?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    display_order?: number;

    @IsNumber()
    @IsOptional()
    estimated_hours?: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    learning_outcomes?: string[];

    @IsOptional()
    metadata?: JsonObject;
}

export class UpdateChapterDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(200)
    name?: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    chapter_number?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    display_order?: number;

    @IsNumber()
    @IsOptional()
    estimated_hours?: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    learning_outcomes?: string[];

    @IsOptional()
    metadata?: JsonObject;
}

// Topic DTOs
export class CreateTopicDto {
    @IsUUID()
    @IsNotEmpty()
    chapter_id!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(200)
    name!: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    topic_number?: number;

    @IsNumber()
    @IsOptional()
    @Min(0.5)
    estimated_hours?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    display_order?: number;

    @IsOptional()
    resource_links?: JsonValue[] | JsonObject;

    @IsOptional()
    metadata?: JsonObject;
}

export class UpdateTopicDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(200)
    name?: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    topic_number?: number;

    @IsNumber()
    @IsOptional()
    @Min(0.5)
    estimated_hours?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    @Min(0)
    display_order?: number;

    @IsOptional()
    resource_links?: JsonValue[] | JsonObject;

    @IsOptional()
    metadata?: JsonObject;
}
