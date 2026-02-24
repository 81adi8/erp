// Common Types shared across tenant modules

// API Response types
export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface QueryParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    [key: string]: unknown;
}

// User types
export interface BaseUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
}

// Form state types
export interface FormState<T> {
    data: T;
    errors: Partial<Record<keyof T, string>>;
    isSubmitting: boolean;
    isValid: boolean;
}

// Modal state
export interface ModalState {
    isOpen: boolean;
    type?: string;
    data?: unknown;
}

// Filter state
export interface FilterState {
    search: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    [key: string]: unknown;
}
