import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject {
    [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}

export class PaginationQueryDto {
    @IsInt()
    @IsOptional()
    @Min(1)
    page?: number = 1;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(100)
    limit?: number = 50;

    @IsString()
    @IsOptional()
    search?: string;

    @IsString()
    @IsOptional()
    sortBy?: string;

    @IsString()
    @IsOptional()
    sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

// Paginated response interface
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
