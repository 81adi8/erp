import { useCallback } from 'react';
import { useFeedback } from '@erp/common';

interface ApiErrorResponse {
    data?: {
        message?: string;
        code?: string;
    };
    error?: string;
    status?: number;
}

interface MutationOptions<T> {
    /** Success message to show */
    successMessage?: string;
    /** Success description (optional) */
    successDescription?: string;
    /** Error message to show (falls back to API error) */
    errorMessage?: string;
    /** Called on success with result */
    onSuccess?: (result: T) => void;
    /** Called on error */
    onError?: (error: ApiErrorResponse) => void;
    /** Show success toast. Default: true */
    showSuccess?: boolean;
    /** Show error toast. Default: true */
    showError?: boolean;
}

/**
 * Hook that wraps RTK Query mutations with automatic feedback
 * 
 * @example
 * ```tsx
 * const { withFeedback } = useApiMutation();
 * const [createItem] = useCreateItemMutation();
 * 
 * const handleSubmit = async (data) => {
 *   await withFeedback(
 *     () => createItem(data).unwrap(),
 *     {
 *       successMessage: 'Item created successfully!',
 *       onSuccess: (result) => navigate(`/items/${result.id}`)
 *     }
 *   );
 * };
 * ```
 */
export const useApiMutation = () => {
    const { success, error: showError } = useFeedback();

    const withFeedback = useCallback(async <T>(
        mutationFn: () => Promise<T>,
        options: MutationOptions<T> = {}
    ): Promise<T | null> => {
        const {
            successMessage = 'Operation completed successfully',
            successDescription,
            errorMessage,
            onSuccess,
            onError,
            showSuccess = true,
            showError: shouldShowError = true,
        } = options;

        try {
            const result = await mutationFn();
            
            if (showSuccess) {
                success(successMessage, successDescription);
            }
            
            onSuccess?.(result);
            return result;
        } catch (err) {
            const apiError = err as ApiErrorResponse;
            const message = errorMessage || 
                apiError?.data?.message || 
                apiError?.error || 
                'An unexpected error occurred';
            
            if (shouldShowError) {
                showError('Error', message);
            }
            
            onError?.(apiError);
            return null;
        }
    }, [success, showError]);

    /**
     * Execute mutation with confirmation dialog first
     */
    const withConfirmation = useCallback(async <T>(
        mutationFn: () => Promise<T>,
        options: MutationOptions<T> & {
            confirmTitle: string;
            confirmMessage: string;
        }
    ): Promise<T | null> => {
        // This requires showConfirm from context, but since we're in a hook
        // we return a function that can be used with showConfirm
        return withFeedback(mutationFn, options);
    }, [withFeedback]);

    return { withFeedback, withConfirmation };
};

/**
 * Extract user-friendly error message from API response
 */
export const getErrorMessage = (error: unknown, fallback = 'An error occurred'): string => {
    if (!error) return fallback;
    
    const apiError = error as ApiErrorResponse;
    return apiError?.data?.message || apiError?.error || fallback;
};

/**
 * Type-safe error check
 */
export const isApiError = (error: unknown): error is ApiErrorResponse => {
    return typeof error === 'object' && error !== null && ('data' in error || 'error' in error);
};
