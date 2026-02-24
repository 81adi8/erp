// ============================================================================
// Unauthorized Page (403) - Modern animated design with access denied theme
// ============================================================================
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldX, ArrowLeft, Home, Lock } from 'lucide-react';
import { usePermission } from '../../rbac';

export default function UnauthorizedPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isLoading, roles } = usePermission();

    // Get the original path the user was trying to access
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

    // Redirect back when user becomes authenticated with roles
    useEffect(() => {
        // If user has roles (is authenticated) and not loading, go back to original page
        if (!isLoading && roles.length > 0) {
            navigate(from, { replace: true });
        }
    }, [isLoading, roles, from, navigate]);

    // Show loading state while checking permissions
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ duration: 1 }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"
                />
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-center relative z-10"
            >
                {/* Shaking Shield Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 15,
                        delay: 0.2
                    }}
                    className="mb-8 inline-block"
                >
                    <motion.div
                        animate={{
                            x: [0, -5, 5, -5, 5, 0],
                        }}
                        transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatDelay: 3,
                            ease: 'easeInOut'
                        }}
                        className="relative"
                    >
                        <div className="h-28 w-28 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm border border-red-500/20">
                            <ShieldX className="w-14 h-14 text-red-500" strokeWidth={1.5} />
                        </div>
                        {/* Lock icons floating around */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                            className="absolute -inset-6"
                        >
                            {[0, 120, 240].map((rotation) => (
                                <motion.div
                                    key={rotation}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                    style={{ transform: `rotate(${rotation}deg) translateY(-50px)` }}
                                >
                                    <Lock className="w-5 h-5 text-red-400/50" />
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* 403 Text */}
                <motion.h1
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient"
                >
                    403
                </motion.h1>

                {/* Title & Description */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-4">
                        Access Denied
                    </h2>
                    <p className="text-muted-foreground mt-3 mb-8 max-w-md mx-auto">
                        Sorry, you don't have permission to access this page.
                        Please contact your administrator if you believe this is an error.
                    </p>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Back
                    </motion.button>
                    <Link to="/dashboard">
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20"
                        >
                            <Home className="w-5 h-5" />
                            Go to Dashboard
                        </motion.div>
                    </Link>
                </motion.div>

                {/* Warning badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-10 inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full border border-red-500/20"
                >
                    <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-red-500"
                    />
                    <span className="text-sm text-red-500/80">Authentication Required</span>
                </motion.div>
            </motion.div>
        </div>
    );
}
