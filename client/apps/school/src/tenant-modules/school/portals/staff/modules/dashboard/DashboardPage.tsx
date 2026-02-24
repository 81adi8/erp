// Staff Dashboard - Using Tailwind Theme Classes
import { motion } from 'framer-motion';
import { ListTodo, CheckCircle, Clock, AlertCircle, Bell } from 'lucide-react';

export default function DashboardPage() {
    const stats = [
        { label: 'Total Tasks', value: '12', icon: <ListTodo className="w-6 h-6 text-warning" /> },
        { label: 'Completed', value: '8', icon: <CheckCircle className="w-6 h-6 text-success" /> },
        { label: 'In Progress', value: '3', icon: <Clock className="w-6 h-6 text-primary" /> },
        { label: 'Pending', value: '1', icon: <AlertCircle className="w-6 h-6 text-error" /> },
    ];

    const recentTasks = [
        { title: 'Prepare library inventory report', status: 'In Progress', due: 'Today' },
        { title: 'Update student records', status: 'Completed', due: 'Yesterday' },
        { title: 'Process fee receipts', status: 'Pending', due: 'Tomorrow' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text">Welcome!</h1>
                <p className="text-text-muted">Here's your task overview</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="rounded-xl p-6 bg-card border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-text-muted">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1 text-text">{stat.value}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted">{stat.icon}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl p-6 bg-card border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
                        <ListTodo className="w-5 h-5 text-warning" />Recent Tasks
                    </h2>
                    <div className="space-y-3">
                        {recentTasks.map((task, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                <div>
                                    <p className="text-sm font-medium text-text">{task.title}</p>
                                    <p className="text-xs text-text-muted">Due: {task.due}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full text-white ${task.status === 'Completed' ? 'bg-success' : task.status === 'In Progress' ? 'bg-primary' : 'bg-warning'}`}>
                                    {task.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl p-6 bg-card border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
                        <Bell className="w-5 h-5 text-warning" />Notifications
                    </h2>
                    <div className="space-y-3">
                        {['New task assigned by Admin', 'Reminder: Submit attendance', 'System maintenance scheduled'].map((n, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-warning" />
                                <p className="text-sm text-text">{n}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
