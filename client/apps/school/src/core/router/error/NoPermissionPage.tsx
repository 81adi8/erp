// ============================================================================
// No Permission Page - Beautiful animated access denied UI
// ============================================================================
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldOff, ArrowLeft, Home, KeyRound, AlertTriangle } from 'lucide-react';

interface NoPermissionPageProps {
    /** The permission that was required but missing */
    requiredPermission?: string;
    /** Custom message to display */
    message?: string;
    /** Whether to show the back button */
    showBackButton?: boolean;
}

export default function NoPermissionPage({
    requiredPermission,
    message,
    showBackButton = true
}: NoPermissionPageProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showDetails, setShowDetails] = useState(false);

    // Get the original path the user was trying to access
    const attemptedPath = location.pathname;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 overflow-hidden relative">
            {/* Animated background patterns */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient orbs */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.4, scale: 1 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="absolute top-1/4 -left-20 w-80 h-80 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full blur-3xl"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.3, scale: 1 }}
                    transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
                    className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-full blur-3xl"
                />

                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-center relative z-10 max-w-lg mx-auto"
            >
                {/* Animated Shield Icon */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                        delay: 0.2
                    }}
                    className="mb-8 inline-block"
                >
                    <div className="relative">
                        {/* Main icon container */}
                        <motion.div
                            className="h-32 w-32 bg-gradient-to-br from-red-500/20 via-orange-500/15 to-yellow-500/10 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm border border-red-500/20 shadow-2xl shadow-red-500/10"
                            animate={{
                                boxShadow: [
                                    '0 25px 50px -12px rgba(239, 68, 68, 0.1)',
                                    '0 25px 50px -12px rgba(239, 68, 68, 0.2)',
                                    '0 25px 50px -12px rgba(239, 68, 68, 0.1)',
                                ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <ShieldOff className="w-16 h-16 text-red-500" strokeWidth={1.5} />
                        </motion.div>

                        {/* Floating key icons */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            className="absolute -inset-8"
                        >
                            {[0, 90, 180, 270].map((rotation, i) => (
                                <motion.div
                                    key={rotation}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
                                    className="absolute"
                                    style={{
                                        transform: `rotate(${rotation}deg) translateY(-60px)`,
                                        top: '50%',
                                        left: '50%',
                                    }}
                                >
                                    <KeyRound className="w-5 h-5 text-orange-400/60" />
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>

                {/* Error Code */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mb-4"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/10 rounded-full border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-500">Access Restricted</span>
                    </span>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-3xl md:text-4xl font-bold text-foreground mb-4"
                >
                    Permission Required
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="text-muted-foreground text-lg mb-6 leading-relaxed"
                >
                    {message || "You don't have the required permissions to access this page. Please contact your administrator if you believe this is an error."}
                </motion.p>

                {/* Details toggle */}
                {requiredPermission && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mb-8"
                    >
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                        >
                            {showDetails ? 'Hide details' : 'Show details'}
                        </button>

                        <motion.div
                            initial={false}
                            animate={{ height: showDetails ? 'auto' : 0, opacity: showDetails ? 1 : 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-border text-left">
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Attempted path:</span>
                                        <code className="px-2 py-0.5 bg-background rounded text-foreground">{attemptedPath}</code>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Required permission:</span>
                                        <code className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded">{requiredPermission}</code>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    {showBackButton && (
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-all font-medium border border-border"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Go Back
                        </motion.button>
                    )}
                    <Link to="/dashboard">
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium shadow-lg shadow-primary/20"
                        >
                            <Home className="w-5 h-5" />
                            Go to Dashboard
                        </motion.div>
                    </Link>
                </motion.div>

                {/* Help text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-8 text-sm text-muted-foreground"
                >
                    Need access? Contact your school administrator or IT support.
                </motion.p>
            </motion.div>
        </div>
    );
}

export { NoPermissionPage };
