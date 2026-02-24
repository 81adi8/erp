// ============================================================================
// Dynamic Module Loader Utility - Modern animated fallbacks
// ============================================================================
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import type { TenantType, TenantModule } from '../config/tenantModuleConfig';
import { loadTenantModule as loadModule } from '../config/tenantModuleConfig';

// Cache for loaded modules
const moduleCache = new Map<TenantType, TenantModule>();

// Load and cache tenant module
export async function loadTenantModule(type: TenantType): Promise<TenantModule | null> {
    // Check cache first
    if (moduleCache.has(type)) {
        return moduleCache.get(type)!;
    }

    const module = await loadModule(type);
    if (module) {
        moduleCache.set(type, module);
    }
    return module;
}

// Clear module cache (useful for hot reload or testing)
export function clearModuleCache(): void {
    moduleCache.clear();
}

// Preload module for better UX
export async function preloadTenantModule(type: TenantType): Promise<void> {
    try {
        await loadTenantModule(type);
    } catch (error) {
        console.warn(`Failed to preload module: ${type}`, error);
    }
}

// Create lazy component wrapper
export function createLazyComponent<T extends ComponentType<unknown>>(
    importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
    return lazy(importFn);
}

// Loading fallback component with modern animation
interface LoadingFallbackProps {
    message?: string;
}

export function LoadingFallback({ message = 'Loading...' }: LoadingFallbackProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center min-h-[200px] p-8"
        >
            {/* Animated spinner */}
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mb-4"
            >
                <div className="relative">
                    {/* Outer ring */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
                    />
                    {/* Inner icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        >
                            <Loader2 className="w-5 h-5 text-primary/60" />
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* Loading message */}
            <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-sm"
            >
                {message}
            </motion.p>

            {/* Animated dots */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex gap-1 mt-3"
            >
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.15,
                            ease: 'easeInOut'
                        }}
                        className="w-1.5 h-1.5 rounded-full bg-primary/50"
                    />
                ))}
            </motion.div>
        </motion.div>
    );
}

// Error fallback component with modern design
interface ErrorFallbackProps {
    error: Error;
    resetError?: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center"
        >
            {/* Animated icon */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="mb-4"
            >
                <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="h-14 w-14 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-red-500/20"
                >
                    <AlertCircle className="w-7 h-7 text-red-500" strokeWidth={1.5} />
                </motion.div>
            </motion.div>

            {/* Error title */}
            <motion.h3
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg font-semibold text-foreground mb-2"
            >
                Failed to load module
            </motion.h3>

            {/* Error message */}
            <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground mb-4 max-w-sm"
            >
                {error.message}
            </motion.p>

            {/* Retry button */}
            {resetError && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={resetError}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/20"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </motion.button>
                </motion.div>
            )}
        </motion.div>
    );
}

// Suspense wrapper with error handling
interface SuspenseWrapperProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export function SuspenseWrapper({ children, fallback }: SuspenseWrapperProps) {
    return (
        <Suspense fallback={fallback || <LoadingFallback />}>
            {children}
        </Suspense>
    );
}
