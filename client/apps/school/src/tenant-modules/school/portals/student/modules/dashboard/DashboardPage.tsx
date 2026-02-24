// Student Dashboard - Using Tailwind Theme Classes
import { motion } from 'framer-motion';
import { BookOpen, ClipboardList, Award, Calendar, Clock, Bell } from 'lucide-react';

export default function DashboardPage() {
    const stats = [
        { label: 'Enrolled Courses', value: '6', icon: <BookOpen className="w-6 h-6 text-success" /> },
        { label: 'Pending Assignments', value: '3', icon: <ClipboardList className="w-6 h-6 text-warning" /> },
        { label: 'Average Grade', value: 'A-', icon: <Award className="w-6 h-6 text-secondary" /> },
        { label: "Today's Classes", value: '4', icon: <Calendar className="w-6 h-6 text-primary" /> },
    ];

    const upcomingClasses = [
        { time: '9:00 AM', subject: 'Mathematics', teacher: 'Mr. Johnson' },
        { time: '11:00 AM', subject: 'Physics', teacher: 'Ms. Smith' },
        { time: '2:00 PM', subject: 'English', teacher: 'Mrs. Davis' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text">Hello, Student!</h1>
                <p className="text-text-muted">Here's your academic overview</p>
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
                        <Clock className="w-5 h-5 text-success" />Today's Classes
                    </h2>
                    <div className="space-y-3">
                        {upcomingClasses.map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted">
                                <span className="text-sm font-medium w-20 text-success">{item.time}</span>
                                <div>
                                    <p className="text-sm font-medium text-text">{item.subject}</p>
                                    <p className="text-xs text-text-muted">{item.teacher}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl p-6 bg-card border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
                        <Bell className="w-5 h-5 text-warning" />Announcements
                    </h2>
                    <div className="space-y-3">
                        {['Math assignment due tomorrow', 'Parent-teacher meeting next week', 'Sports day registration open'].map((n, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-success" />
                                <p className="text-sm text-text">{n}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
