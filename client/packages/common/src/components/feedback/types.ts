export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'delete';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
export type AlertVariant = 'primary' | 'error' | 'warning' | 'success' | 'info';

export interface AlertOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
    variant?: AlertVariant;
    isLoading?: boolean;
    /** If true, the alert cannot be dismissed by clicking outside or pressing escape */
    persistent?: boolean;
}

export interface ToastOptions {
    message: string;
    description?: string;
    type?: FeedbackType;
    /** Duration in ms. Set to 0 for persistent toast. Default: 5000 */
    duration?: number;
    /** Toast position. Uses context default if not specified */
    position?: ToastPosition;
    /** Action button */
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface ToastItem extends ToastOptions {
    id: string;
}

export interface FeedbackContextType {
    // Alert/Confirm/Delete dialogs
    showAlert: (options: AlertOptions) => void;
    showConfirm: (options: AlertOptions) => void;
    showDelete: (options: AlertOptions) => void;
    hideAlert: () => void;
    
    // Toast notifications
    showToast: (options: ToastOptions) => void;
    success: (message: string, description?: string) => void;
    error: (message: string, description?: string) => void;
    warning: (message: string, description?: string) => void;
    info: (message: string, description?: string) => void;
    hideToast: (id: string) => void;
    clearAllToasts: () => void;
    
    // Configuration
    setDefaultPosition: (position: ToastPosition) => void;
}

export interface FeedbackProviderProps {
    children: React.ReactNode;
    /** Default toast position. Default: 'bottom-right' */
    defaultPosition?: ToastPosition;
    /** Maximum number of toasts to show at once. Default: 5 */
    maxToasts?: number;
}
