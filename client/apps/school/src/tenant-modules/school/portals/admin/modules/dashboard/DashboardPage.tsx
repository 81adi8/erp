// ============================================================================
// Admin Dashboard Page - Using Tailwind Theme Classes
// ============================================================================

import { motion } from 'framer-motion';
import { Users, GraduationCap, School, TrendingUp, Calendar, ClipboardCheck, Bell } from 'lucide-react';

export default function DashboardPage() {
    const stats = [
        { label: 'Total Students', value: '1,245', icon: <GraduationCap className="w-6 h-6 text-primary" />, change: '+12%' },
        { label: 'Total Teachers', value: '78', icon: <Users className="w-6 h-6 text-secondary" />, change: '+3%' },
        { label: 'Active Classes', value: '42', icon: <School className="w-6 h-6 text-success" />, change: '+5%' },
        { label: 'Attendance Rate', value: '94.2%', icon: <TrendingUp className="w-6 h-6 text-warning" />, change: '+2.1%' },
    ];

    const recentActivities = [
        { action: 'New student enrolled', time: '2 minutes ago', type: 'success' },
        { action: 'Fee payment received', time: '15 minutes ago', type: 'success' },
        { action: 'Teacher absence reported', time: '1 hour ago', type: 'warning' },
        { action: 'Parent meeting scheduled', time: '2 hours ago', type: 'info' },
    ];

    const upcomingEvents = [
        { title: 'Parent-Teacher Meeting', date: 'Dec 20, 2024', time: '10:00 AM' },
        { title: 'Annual Sports Day', date: 'Dec 25, 2024', time: '9:00 AM' },
        { title: 'Winter Vacation Starts', date: 'Dec 28, 2024', time: 'All Day' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text">Dashboard</h1>
                <p className="text-text-muted">Welcome back! Here's what's happening at your school.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                        className="rounded-xl p-6 bg-card border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-text-muted">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1 text-text">{stat.value}</p>
                                <p className="text-sm mt-1 text-success">{stat.change} this month</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted">{stat.icon}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl p-6 bg-card border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
                        <ClipboardCheck className="w-5 h-5 text-primary" />Recent Activity
                    </h2>
                    <div className="space-y-4">
                        {recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${activity.type === 'success' ? 'bg-success' : activity.type === 'warning' ? 'bg-warning' : 'bg-info'}`} />
                                    <span className="text-text">{activity.action}</span>
                                </div>
                                <span className="text-xs text-text-muted">{activity.time}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl p-6 bg-card border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
                        <Calendar className="w-5 h-5 text-secondary" />Upcoming Events
                    </h2>
                    <div className="space-y-4">
                        {upcomingEvents.map((event, index) => (
                            <div key={index} className="p-4 rounded-lg bg-muted border-l-3 border-primary">
                                <h3 className="font-medium text-text">{event.title}</h3>
                                <p className="text-sm mt-1 text-text-muted">{event.date} • {event.time}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-6 bg-card border border-border">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
                    <Bell className="w-5 h-5 text-warning" />Quick Actions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Add Student', 'Record Attendance', 'Create Class', 'Send Notice'].map((action) => (
                        <button key={action} className="p-4 rounded-lg text-center bg-muted text-text border border-border hover:bg-surface-hover transition-all">
                            {action}
                        </button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
