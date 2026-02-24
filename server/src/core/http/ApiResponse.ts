export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export class ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: string[];
  meta?: ApiMeta;
  statusCode: number;

  constructor(
    success: boolean,
    message: string,
    data: T | null = null,
    statusCode = 200,
    errors?: string[],
    meta?: ApiMeta
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
    this.errors = errors;
    this.meta = meta;
  }

  static success<T>(data: T, message = 'Success', statusCode = 200, meta?: ApiMeta): ApiResponse<T> {
    return new ApiResponse(true, message, data, statusCode, undefined, meta);
  }

  static error(message: string, statusCode = 400, errors: string[] = []): ApiResponse<null> {
    return new ApiResponse(false, message, null, statusCode, errors);
  }

  static created<T>(data: T, message = 'Created successfully'): ApiResponse<T> {
    return new ApiResponse(true, message, data, 201);
  }

  static noContent(message = 'No content'): ApiResponse<null> {
    return new ApiResponse(true, message, null, 204);
  }
}

export interface ApiResult<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: string[];
  meta?: ApiMeta;
  statusCode: number;
}

export function success<T>(data: T, message = 'Success', meta?: ApiMeta): ApiResult<T> {
  return { success: true, message, data, meta, statusCode: 200 };
}

export function created<T>(data: T, message = 'Created successfully'): ApiResult<T> {
  return { success: true, message, data, statusCode: 201 };
}

export function error(message: string, statusCode = 400, errors: string[] = []): ApiResult<null> {
  return { success: false, message, data: null, errors, statusCode };
}
