import React, { createContext, useContext, useState, useCallback, useMemo, memo } from 'react';
import type { 
    AlertOptions, 
    ToastOptions, 
    FeedbackContextType, 
    FeedbackType, 
    ToastItem,
    ToastPosition,
    FeedbackProviderProps 
} from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, XCircle, X, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

// ==================== Constants (moved outside component) ====================

const POSITION_CLASSES: Record<ToastPosition, string> = {
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'top-center': 'top-6 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
} as const;

const TOAST_ICONS: Record<string, React.ReactNode> = {
    success: <CheckCircle2 size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
} as const;

const TOAST_COLORS: Record<string, string> = {
    success: 'text-emerald-500',
    error: 'text-rose-500',
    warning: 'text-amber-500',
    info: 'text-blue-500',
} as const;

const ALERT_ICONS: Record<string, React.ReactNode> = {
    delete: <Trash2 size={28} />,
    confirm: <AlertTriangle size={28} />,
    info: <Info size={28} />,
} as const;

const ALERT_STYLES: Record<string, string> = {
    delete: 'bg-rose-500/10 text-rose-500',
    confirm: 'bg-amber-500/10 text-amber-500',
    info: 'bg-blue-500/10 text-blue-500',
} as const;

// Pre-computed animation variants
const ANIMATION_VARIANTS = {
    'top-right': { initial: { opacity: 0, x: 20, y: -10 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: 20 } },
    'top-left': { initial: { opacity: 0, x: -20, y: -10 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: -20 } },
    'top-center': { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
    'bottom-right': { initial: { opacity: 0, x: 20, y: 10 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: 20 } },
    'bottom-left': { initial: { opacity: 0, x: -20, y: 10 }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, x: -20 } },
    'bottom-center': { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 } },
} as const;

const SPRING_CONFIG = { type: 'spring', damping: 25, stiffness: 350 } as const;

// ==================== Memoized Toast Component ====================

interface ToastItemProps {
    toast: ToastItem;
    position: ToastPosition;
    onDismiss: (id: string) => void;
}

const ToastItemComponent = memo<ToastItemProps>(({ toast, position, onDismiss }) => {
    const effectivePosition = toast.position || position;
    const variants = ANIMATION_VARIANTS[effectivePosition];
    const icon = TOAST_ICONS[toast.type || 'info'];
    const colorClass = TOAST_COLORS[toast.type || 'info'];

    return (
        <motion.div
            layout
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={SPRING_CONFIG}
            className="pointer-events-auto"
        >
            <div className="min-w-[300px] max-w-[400px] bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-xl p-4 flex items-start gap-3">
                <div className={`shrink-0 ${colorClass}`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{toast.message}</p>
                    {toast.description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {toast.description}
                        </p>
                    )}
                    {toast.action && (
                        <button
                            onClick={toast.action.onClick}
                            className="mt-2 text-xs font-semibold text-primary hover:underline transition-colors"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>
                <button
                    onClick={() => onDismiss(toast.id)}
                    className="shrink-0 p-1 hover:bg-muted rounded-md transition-colors"
                    aria-label="Dismiss"
                >
                    <X size={14} className="text-muted-foreground" />
                </button>
            </div>
        </motion.div>
    );
});

ToastItemComponent.displayName = 'ToastItem';

// ==================== Memoized Toast Container ====================

interface ToastContainerProps {
    toasts: ToastItem[];
    position: ToastPosition;
    onDismiss: (id: string) => void;
}

const ToastContainer = memo<ToastContainerProps>(({ toasts, position, onDismiss }) => {
    if (toasts.length === 0) return null;

    return (
        <div className={`fixed z-[9999] flex flex-col gap-2 pointer-events-none ${POSITION_CLASSES[position]}`}>
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItemComponent
                        key={toast.id}
                        toast={toast}
                        position={position}
                        onDismiss={onDismiss}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
});

ToastContainer.displayName = 'ToastContainer';

// ==================== Memoized Alert Modal ====================

interface AlertModalProps {
    alert: (AlertOptions & { type: FeedbackType; isOpen: boolean }) | null;
    onHide: () => void;
}

const AlertModal = memo<AlertModalProps>(({ alert, onHide }) => {
    if (!alert?.isOpen) return null;

    const icon = ALERT_ICONS[alert.type] || ALERT_ICONS.info;
    const iconStyle = ALERT_STYLES[alert.type] || ALERT_STYLES.info;
    
    const buttonVariant = (): 'primary' | 'secondary' | 'danger' => {
        if (alert.type === 'delete') return 'danger';
        if (alert.variant === 'error') return 'danger';
        return 'primary';
    };

    const handleConfirm = async () => {
        if (alert.onConfirm) {
            try {
                await alert.onConfirm();
            } catch {
                // Keep dialog open on error
                return;
            }
        }
        onHide();
    };

    const handleCancel = () => {
        alert.onCancel?.();
        onHide();
    };

    return (
        <Modal
            isOpen={alert.isOpen}
            onClose={onHide}
            size="sm"
            showCloseButton={!alert.isLoading && !alert.persistent}
            closeOnOutsideClick={!alert.isLoading && !alert.persistent}
            closeOnEscape={!alert.isLoading && !alert.persistent}
        >
            <div className="flex flex-col items-center text-center py-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${iconStyle}`}>
                    {icon}
                </div>

                <h3 className="text-lg font-bold text-foreground mb-1">{alert.title}</h3>
                {alert.description && (
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-[280px]">
                        {alert.description}
                    </p>
                )}

                <div className="flex items-center gap-3 w-full">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1"
                        disabled={alert.isLoading}
                    >
                        {alert.cancelLabel || 'Cancel'}
                    </Button>
                    <Button
                        variant={buttonVariant()}
                        onClick={handleConfirm}
                        className="flex-1"
                        isLoading={alert.isLoading}
                    >
                        {alert.confirmLabel || (alert.type === 'delete' ? 'Delete' : 'Confirm')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
});

AlertModal.displayName = 'AlertModal';

// ==================== Main Provider ====================

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ 
    children, 
    defaultPosition = 'bottom-right',
    maxToasts = 5 
}) => {
    const [alert, setAlert] = useState<(AlertOptions & { type: FeedbackType; isOpen: boolean }) | null>(null);
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [toastPosition, setToastPosition] = useState<ToastPosition>(defaultPosition);

    // ==================== Alert Methods ====================
    
    const showAlert = useCallback((options: AlertOptions) => {
        setAlert({ ...options, type: 'info', isOpen: true });
    }, []);

    const showConfirm = useCallback((options: AlertOptions) => {
        setAlert({ ...options, type: 'confirm', isOpen: true });
    }, []);

    const showDelete = useCallback((options: AlertOptions) => {
        setAlert({ ...options, type: 'delete', isOpen: true });
    }, []);

    const hideAlert = useCallback(() => {
        setAlert((prev) => prev ? { ...prev, isOpen: false } : null);
    }, []);

    // ==================== Toast Methods ====================
    
    const showToast = useCallback((options: ToastOptions) => {
        const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newToast: ToastItem = { ...options, id };
        
        setToasts((prev) => {
            const updated = [...prev, newToast];
            return updated.length > maxToasts ? updated.slice(-maxToasts) : updated;
        });

        // Auto-dismiss
        const duration = options.duration ?? 4000;
        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, [maxToasts]);

    const success = useCallback((message: string, description?: string) => {
        showToast({ message, description, type: 'success' });
    }, [showToast]);

    const error = useCallback((message: string, description?: string) => {
        showToast({ message, description, type: 'error', duration: 6000 });
    }, [showToast]);

    const warning = useCallback((message: string, description?: string) => {
        showToast({ message, description, type: 'warning' });
    }, [showToast]);

    const info = useCallback((message: string, description?: string) => {
        showToast({ message, description, type: 'info' });
    }, [showToast]);

    const hideToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const clearAllToasts = useCallback(() => {
        setToasts([]);
    }, []);

    const setDefaultPosition = useCallback((position: ToastPosition) => {
        setToastPosition(position);
    }, []);

    // ==================== Memoized Context Value ====================
    
    const contextValue = useMemo<FeedbackContextType>(() => ({
        showAlert,
        showConfirm,
        showDelete,
        showToast,
        success,
        error,
        warning,
        info,
        hideAlert,
        hideToast,
        clearAllToasts,
        setDefaultPosition,
    }), [
        showAlert, showConfirm, showDelete, showToast,
        success, error, warning, info,
        hideAlert, hideToast, clearAllToasts, setDefaultPosition
    ]);

    return (
        <FeedbackContext.Provider value={contextValue}>
            {children}
            <AlertModal alert={alert} onHide={hideAlert} />
            <ToastContainer toasts={toasts} position={toastPosition} onDismiss={hideToast} />
        </FeedbackContext.Provider>
    );
};

// ==================== Hook ====================

/**
 * Hook to access the global feedback system
 * 
 * @example
 * ```tsx
 * const { success, error, showConfirm, showDelete } = useFeedback();
 * 
 * success('Saved!', 'Your changes have been saved.');
 * error('Failed', 'Could not complete the operation.');
 * 
 * showDelete({
 *   title: 'Delete Item?',
 *   description: 'This cannot be undone.',
 *   onConfirm: async () => { await deleteItem(); }
 * });
 * ```
 */
export const useFeedback = (): FeedbackContextType => {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback must be used within a FeedbackProvider');
    }
    return context;
};

// Legacy alias
export const useAlert = useFeedback;
