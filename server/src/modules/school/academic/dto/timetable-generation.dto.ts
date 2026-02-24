import { IsUUID, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateTimetableDto {
    @IsUUID()
    @IsNotEmpty()
    section_id!: string;

    @IsUUID()
    @IsNotEmpty()
    session_id!: string;

    @IsUUID()
    @IsOptional()
    template_id?: string;
}

export interface GenerationResult {
    success: boolean;
    slots_created: number;
    warnings?: string[];
    errors?: string[];
}
