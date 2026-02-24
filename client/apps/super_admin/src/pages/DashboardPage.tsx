import React, { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    Building2,
    Users,
    Clock,
    Activity,
    Plus,
    Settings,
    BarChart3,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Server,
    Shield,
} from 'lucide-react';
import { StatsCard, Card, CardHeader, CardTitle, Button, Badge } from '@erp/common';
import { useGetDashboardStatsQuery, useGetInstitutionsQuery } from '../services';
import { useAppSelector } from '../store/hooks';

// ... (containerVariants and itemVariants remain the same)

// Animation variants for staggered children
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: 'easeOut' },
    },
};

// Mock data for when API is not available
const mockStats = {
    totalInstitutions: 24,
    activeInstitutions: 18,
    pendingApprovals: 3,
    totalAdmins: 12,
    recentActivity: [
        { id: '1', type: 'institution_created', message: 'New institution "Delhi Public School" created', timestamp: new Date().toISOString() },
        { id: '2', type: 'user_login', message: 'Admin user logged in from new device', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: '3', type: 'plan_updated', message: 'Institution "ABC Academy" upgraded to Premium', timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id: '4', type: 'institution_activated', message: 'Institution "XYZ College" activated', timestamp: new Date(Date.now() - 10800000).toISOString() },
    ],
};

// Memoized QuickActionCard
const QuickActionCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    to: string;
    color: string;
}> = memo(({ icon, title, description, to, color }) => (
    <Link to={to}>
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`
                p-5 rounded-2xl border border-border bg-surface
                hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20
                transition-all duration-300 cursor-pointer
                group flex flex-col items-start
            `}
        >
            <div className={`w-12 h-12 rounded-2xl bg-${color}/10 flex items-center justify-center mb-4 ring-1 ring-${color}/20 group-hover:scale-110 transition-transform`}>
                <span className={`text-${color}`}>{React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: 2 })}</span>
            </div>
            <h3 className="font-bold text-lg text-text group-hover:text-primary transition-colors">
                {title}
            </h3>
            <p className="text-sm font-medium text-text-muted/70 mt-1">{description}</p>
        </motion.div>
    </Link>
));

QuickActionCard.displayName = 'QuickActionCard';

// Memoized ActivityItem
const ActivityItem: React.FC<{
    type: string;
    message: string;
    timestamp: string;
}> = memo(({ type, message, timestamp }) => {
    const getIcon = useCallback(() => {
        switch (type) {
            case 'institution_created':
                return <Building2 className="w-4 h-4" />;
            case 'user_login':
                return <Users className="w-4 h-4" />;
            case 'plan_updated':
                return <BarChart3 className="w-4 h-4" />;
            case 'institution_activated':
                return <CheckCircle className="w-4 h-4" />;
            default:
                return <Activity className="w-4 h-4" />;
        }
    }, [type]);

    const formatTime = useCallback((ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return new Date(ts).toLocaleDateString();
    }, []);

    return (
        <div className="flex items-start gap-4 py-4 border-b border-border/40 last:border-0 group cursor-default">
            <div className="w-10 h-10 rounded-xl bg-muted/40 text-text-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                {React.cloneElement(getIcon() as React.ReactElement, { size: 18, strokeWidth: 2 })}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{message}</p>
                <p className="text-xs font-medium text-text-muted/60 mt-1 uppercase tracking-wider">{formatTime(timestamp)}</p>
            </div>
        </div>
    );
});

ActivityItem.displayName = 'ActivityItem';

export const DashboardPage: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);

    // Try to fetch real data, fallback to mock
    const { data: statsData, isLoading: statsLoading } = useGetDashboardStatsQuery();
    const { data: institutionsData, isLoading: institutionsLoading } = useGetInstitutionsQuery({ page: 1, limit: 5 });

    // Using useMemo for derived data
    const stats = useMemo(() => statsData?.data || mockStats, [statsData]);
    const recentInstitutions = useMemo(() => institutionsData?.data || [], [institutionsData]);
    const isLoading = statsLoading;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* Welcome Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                        Welcome back, {user?.name || 'Manish'}
                    </h1>
                    <p className="text-text-muted mt-2 text-lg font-medium opacity-80">
                        Here's what's happening with your platform today.
                    </p>
                </div>
                <Link to="/institutions/new">
                    <Button
                        size="lg"
                        className="rounded-xl px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all font-bold"
                        leftIcon={<Plus className="w-5 h-5" strokeWidth={3} />}
                    >
                        New Institution
                    </Button>
                </Link>
            </motion.div>

            {/* Stats Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Institutions"
                    value={stats.totalInstitutions}
                    icon={<Building2 className="w-5 h-5" />}
                    variant="primary"
                    trend={{ value: 12, label: 'vs last month' }}
                    loading={isLoading}
                />
                <StatsCard
                    title="Active Institutions"
                    value={stats.activeInstitutions}
                    icon={<CheckCircle className="w-5 h-5" />}
                    variant="success"
                    trend={{ value: 8, label: 'vs last month' }}
                    loading={isLoading}
                />
                <StatsCard
                    title="Pending Approvals"
                    value={stats.pendingApprovals}
                    icon={<Clock className="w-5 h-5" />}
                    variant="warning"
                    trend={{ value: -5, label: 'vs last week' }}
                    loading={isLoading}
                />
                <StatsCard
                    title="Total Admins"
                    value={stats.totalAdmins}
                    icon={<Users className="w-5 h-5" />}
                    variant="default"
                    trend={{ value: 3, label: 'new this month' }}
                    loading={isLoading}
                />
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card variant="default" padding="none">
                        <CardHeader className="px-5 pt-5">
                            <div className="flex items-center justify-between">
                                <CardTitle>Recent Activity</CardTitle>
                                <Badge variant="info">{stats.recentActivity.length} new</Badge>
                            </div>
                        </CardHeader>
                        <div className="px-5 pb-5">
                            {stats.recentActivity.length > 0 ? (
                                stats.recentActivity.map((activity) => (
                                    <ActivityItem
                                        key={activity.id}
                                        type={activity.type}
                                        message={activity.message}
                                        timestamp={activity.timestamp}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8 text-text-muted">
                                    No recent activity
                                </div>
                            )}
                            <Link
                                to="/activity"
                                className="flex items-center justify-center gap-2 mt-4 text-sm text-primary hover:text-primary-dark transition-colors"
                            >
                                View all activity
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </Card>
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants}>
                    <Card variant="default" padding="none">
                        <CardHeader className="px-5 pt-5">
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <div className="p-5 pt-0 space-y-3">
                            <QuickActionCard
                                icon={<Plus className="w-5 h-5" />}
                                title="Create Institution"
                                description="Add a new tenant to the platform"
                                to="/institutions/new"
                                color="primary"
                            />
                            <QuickActionCard
                                icon={<Users className="w-5 h-5" />}
                                title="Manage Admins"
                                description="Add or modify admin users"
                                to="/admins"
                                color="secondary"
                            />
                            <QuickActionCard
                                icon={<Settings className="w-5 h-5" />}
                                title="System Settings"
                                description="Configure platform settings"
                                to="/settings"
                                color="warning"
                            />
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* System Health */}
            <motion.div variants={itemVariants}>
                <Card variant="glass">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-success/10">
                                <Server className="w-6 h-6 text-success" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text">System Health</h3>
                                <p className="text-sm text-text-muted">All systems operational</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-xs text-text-muted">Uptime</p>
                                <p className="font-semibold text-success">99.9%</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-text-muted">Response</p>
                                <p className="font-semibold text-text">45ms</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-text-muted">Active Sessions</p>
                                <p className="font-semibold text-text">128</p>
                            </div>
                            <Badge variant="success" size="md">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    Healthy
                                </span>
                            </Badge>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    );
};
