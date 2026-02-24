// ============================================================================
// Error Boundary Components - Modern animated design
// ============================================================================
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, RotateCcw, Bug } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// Default error fallback UI component
function DefaultErrorFallback({
    error,
    resetError
}: {
    error: Error;
    resetError: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            {/* Animated icon */}
            <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="mb-6"
            >
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                    className="h-20 w-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-red-500/20"
                >
                    <AlertTriangle className="w-10 h-10 text-red-500" strokeWidth={1.5} />
                </motion.div>
            </motion.div>

            {/* Error title */}
            <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-semibold text-foreground mb-2"
            >
                Something went wrong
            </motion.h2>

            {/* Error message */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground mb-6 max-w-md"
            >
                {error.message || 'An unexpected error occurred'}
            </motion.p>

            {/* Retry button */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetError}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20"
                >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </motion.button>
            </motion.div>
        </div>
    );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Error caught by boundary:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    resetError = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError && this.state.error) {
            if (typeof this.props.fallback === 'function') {
                return this.props.fallback(this.state.error, this.resetError);
            }

            if (this.props.fallback) {
                return this.props.fallback;
            }

            return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
        }

        return this.props.children;
    }
}

// Module-specific error boundary with enhanced styling
interface ModuleErrorBoundaryProps {
    children: ReactNode;
    moduleName?: string;
}

function ModuleErrorFallback({
    error,
    resetError,
    moduleName
}: {
    error: Error;
    resetError: () => void;
    moduleName: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-card/50 rounded-2xl border border-border backdrop-blur-sm"
        >
            {/* Animated bug icon */}
            <motion.div
                initial={{ y: -10 }}
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-5"
            >
                <div className="h-16 w-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-amber-500/20">
                    <Bug className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
                </div>
            </motion.div>

            {/* Error title */}
            <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-lg font-semibold text-foreground mb-2"
            >
                Failed to load {moduleName}
            </motion.h3>

            {/* Error message */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground mb-5 max-w-sm"
            >
                {error.message}
            </motion.p>

            {/* Action buttons */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3"
            >
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetError}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                    <RotateCcw className="w-4 h-4" />
                    Retry
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                </motion.button>
            </motion.div>
        </motion.div>
    );
}

export function ModuleErrorBoundary({ children, moduleName = 'Module' }: ModuleErrorBoundaryProps) {
    return (
        <ErrorBoundary
            fallback={(error, resetError) => (
                <ModuleErrorFallback
                    error={error}
                    resetError={resetError}
                    moduleName={moduleName}
                />
            )}
        >
            {children}
        </ErrorBoundary>
    );
}
