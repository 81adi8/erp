// Common API Helpers
// Utility functions for API operations

/**
 * Format API error for display
 */
export function formatApiError(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        if ('data' in error && typeof (error as { data: unknown }).data === 'object') {
            const data = (error as { data: { message?: string } }).data;
            if (data?.message) return data.message;
        }
        if ('message' in error) return (error as { message: string }).message;
    }
    return 'An unexpected error occurred';
}

/**
 * Build query params string from object
 */
export function buildQueryParams(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value));
        }
    });
    return searchParams.toString();
}

/**
 * Delay utility for async operations
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry utility for API calls
 */
export async function retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxAttempts) {
                await delay(delayMs * attempt);
            }
        }
    }
    throw lastError;
}
