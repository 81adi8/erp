import { motion } from 'framer-motion';
import { Construction, ArrowLeft, Sparkles, Zap, Cpu, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Floating Particle Component - Creates animated floating elements
 */
const FloatingParticle = ({ delay, duration, size, left, top }: {
    delay: number;
    duration: number;
    size: number;
    left: string;
    top: string;
}) => (
    <motion.div
        className="absolute rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 blur-sm"
        style={{ width: size, height: size, left, top }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
            opacity: [0, 0.8, 0.4, 0.8, 0],
            scale: [0.5, 1.2, 0.8, 1, 0.5],
            y: [0, -30, -15, -45, -60],
            x: [0, 10, -5, 15, 0],
        }}
        transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
        }}
    />
);

/**
 * Crystal Shard Component - Creates geometric crystal shapes
 */
const CrystalShard = ({ delay, rotation, scale, left, top }: {
    delay: number;
    rotation: number;
    scale: number;
    left: string;
    top: string;
}) => (
    <motion.div
        className="absolute"
        style={{ left, top }}
        initial={{ opacity: 0, rotate: rotation, scale: 0 }}
        animate={{
            opacity: [0, 0.6, 0.3, 0.6, 0],
            rotate: [rotation, rotation + 180, rotation + 360],
            scale: [0, scale, scale * 0.8, scale, 0],
        }}
        transition={{
            duration: 8,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
        }}
    >
        <div className="w-4 h-4 bg-gradient-to-br from-primary/40 via-secondary/30 to-transparent backdrop-blur-sm"
            style={{
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
        />
    </motion.div>
);

/**
 * Animated Grid Background Pattern
 */
const GridBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Dotted Pattern */}
        <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-primary) 1px, transparent 0)`,
                backgroundSize: '32px 32px',
            }}
        />

        {/* Gradient Mesh Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

        {/* Animated Gradient Orbs */}
        <motion.div
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 blur-3xl"
            animate={{
                scale: [1, 1.2, 1],
                x: [0, 30, 0],
                y: [0, -20, 0],
            }}
            transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
        <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr from-secondary/20 to-primary/10 blur-3xl"
            animate={{
                scale: [1, 1.15, 1],
                x: [0, -20, 0],
                y: [0, 30, 0],
            }}
            transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />

        {/* Center Glow */}
        <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-primary/10 via-primary/5 to-transparent blur-2xl"
            animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    </div>
);

/**
 * Animated Icon Ring - Creates a rotating ring of icons
 */
const IconRing = () => {
    const icons = [Cpu, Zap, Sparkles, Rocket];

    return (
        <motion.div
            className="absolute inset-0 z-20"
            style={{ width: '200px', height: '200px', left: '50%', top: '50%', marginLeft: '-100px', marginTop: '-100px' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
            {icons.map((Icon, index) => {
                const angle = (index * 360) / icons.length;
                const radius = 80;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;

                return (
                    <motion.div
                        key={index}
                        className="absolute"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                        }}
                        animate={{ rotate: -360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    >
                        <div className="p-2.5 rounded-xl bg-surface/90 backdrop-blur-md border border-border/60 shadow-lg shadow-primary/10">
                            <Icon className="w-5 h-5 text-primary" />
                        </div>
                    </motion.div>
                );
            })}
        </motion.div>
    );
};

/**
 * Progress Bar Animation
 */
const ProgressBar = () => (
    <div className="w-64 h-1.5 bg-surface-hover/50 rounded-full overflow-hidden backdrop-blur-sm">
        <motion.div
            className="h-full bg-gradient-to-r from-primary via-secondary to-primary rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
            style={{ width: '50%' }}
        />
    </div>
);

/**
 * UnderDevelopmentPage - Premium animated maintenance page
 */
export default function UnderDevelopmentPage() {
    const navigate = useNavigate();

    // Generate random particles
    const particles = useMemo(() =>
        Array.from({ length: 15 }, (_, i) => ({
            id: i,
            delay: Math.random() * 5,
            duration: 4 + Math.random() * 4,
            size: 8 + Math.random() * 16,
            left: `${10 + Math.random() * 80}%`,
            top: `${20 + Math.random() * 60}%`,
        })), []);

    // Generate crystal shards
    const crystals = useMemo(() =>
        Array.from({ length: 8 }, (_, i) => ({
            id: i,
            delay: Math.random() * 4,
            rotation: Math.random() * 360,
            scale: 0.8 + Math.random() * 0.6,
            left: `${5 + Math.random() * 90}%`,
            top: `${10 + Math.random() * 80}%`,
        })), []);

    return (
        <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-120px)] py-6 px-4 text-center overflow-visible">
            {/* Animated Background */}
            <GridBackground />

            {/* Floating Particles */}
            {particles.map((p) => (
                <FloatingParticle key={p.id} {...p} />
            ))}

            {/* Crystal Shards */}
            {crystals.map((c) => (
                <CrystalShard key={c.id} {...c} />
            ))}

            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col items-center space-y-6">

                {/* Hero Icon Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
                    className="relative w-52 h-52 overflow-visible"
                >
                    {/* Rotating Icon Ring */}
                    <IconRing />

                    {/* Center Glass Card */}
                    <motion.div
                        className="absolute inset-0 m-auto w-28 h-28 rounded-3xl bg-gradient-to-br from-surface/90 to-surface/70 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/20 flex items-center justify-center"
                        animate={{
                            boxShadow: [
                                '0 25px 50px -12px rgba(var(--color-primary), 0.15)',
                                '0 25px 50px -12px rgba(var(--color-primary), 0.3)',
                                '0 25px 50px -12px rgba(var(--color-primary), 0.15)',
                            ],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <motion.div
                            animate={{
                                rotate: [0, 5, -5, 0],
                                scale: [1, 1.05, 1],
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Construction className="w-14 h-14 text-primary" strokeWidth={1.5} />
                        </motion.div>
                    </motion.div>

                    {/* Pulse Rings */}
                    <motion.div
                        className="absolute inset-0 m-auto w-28 h-28 rounded-3xl border-2 border-primary/30"
                        animate={{
                            scale: [1, 1.5, 1.8],
                            opacity: [0.5, 0.2, 0],
                        }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.div
                        className="absolute inset-0 m-auto w-28 h-28 rounded-3xl border-2 border-secondary/30"
                        animate={{
                            scale: [1, 1.5, 1.8],
                            opacity: [0.5, 0.2, 0],
                        }}
                        transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, ease: 'easeOut' }}
                    />
                </motion.div>

                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="max-w-lg space-y-4"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
                    >
                        <Sparkles className="w-4 h-4" />
                        Coming Soon
                    </motion.div>

                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent tracking-tight sm:text-5xl md:text-6xl">
                        Under Development
                    </h1>

                    <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
                        We're crafting something extraordinary for you. This feature is being built with care and will be available soon.
                    </p>
                </motion.div>

                {/* Progress Indicator */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col items-center gap-3"
                >
                    <ProgressBar />
                    <span className="text-sm text-muted-foreground">Building in progress...</span>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 pt-4"
                >
                    <motion.button
                        onClick={() => navigate(-1)}
                        className="group relative flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-2xl font-semibold overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {/* Button Shine Effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                            animate={{ translateX: ['−100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        />
                        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        Go Back
                    </motion.button>

                    <motion.button
                        onClick={() => navigate('/admin/dashboard')}
                        className="group flex items-center gap-2 px-8 py-4 bg-surface/80 backdrop-blur-sm text-foreground rounded-2xl font-semibold border border-border hover:border-primary/50 hover:bg-surface transition-all duration-300"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Rocket className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        Dashboard
                    </motion.button>
                </motion.div>

                {/* Status Badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="pt-4"
                >
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-surface/60 backdrop-blur-md border border-border/50 text-sm">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
                        </span>
                        <span className="text-muted-foreground">
                            System Online
                        </span>
                        <span className="h-4 w-px bg-border"></span>
                        <span className="font-mono text-xs text-primary/80">
                            v0.1.0-beta
                        </span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
