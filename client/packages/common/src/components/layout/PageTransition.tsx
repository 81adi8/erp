// ============================================================================
// Page Transition Component - Framer Motion animations for page changes
// ============================================================================
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    /** Animation variant */
    variant?: 'fade' | 'slide' | 'scale' | 'slideUp';
    /** Animation duration in seconds */
    duration?: number;
}

// Animation variants
const variants = {
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    },
    slide: {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
    },
    scale: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
    },
    slideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    },
};

/**
 * PageTransition - Wrap pages for smooth animated transitions
 * 
 * @example
 * <PageTransition variant="fade">
 *   <DashboardPage />
 * </PageTransition>
 */
export function PageTransition({
    children,
    variant = 'fade',
    duration = 0.3,
}: PageTransitionProps) {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                initial={variants[variant].initial}
                animate={variants[variant].animate}
                exit={variants[variant].exit}
                transition={{
                    duration,
                    ease: 'easeInOut',
                }}
                className="w-full h-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * FadeIn - Simple fade-in animation wrapper
 */
export function FadeIn({
    children,
    delay = 0,
    duration = 0.5,
}: {
    children: ReactNode;
    delay?: number;
    duration?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, delay, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}

/**
 * StaggerContainer - Container for staggered children animations
 */
export function StaggerContainer({
    children,
    staggerDelay = 0.1,
}: {
    children: ReactNode;
    staggerDelay?: number;
}) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: staggerDelay,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

/**
 * StaggerItem - Item with stagger animation (use inside StaggerContainer)
 */
export function StaggerItem({ children }: { children: ReactNode }) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}

export default PageTransition;
