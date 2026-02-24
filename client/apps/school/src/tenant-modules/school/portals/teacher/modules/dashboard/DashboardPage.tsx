// Teacher Dashboard - Using Tailwind Theme Classes
import { motion } from 'framer-motion';
import { Users, BookOpen, ClipboardCheck, Clock, Calendar, Bell } from 'lucide-react';

export default function DashboardPage() {
    const stats = [
        { label: 'My Classes', value: '6', icon: <BookOpen className="w-6 h-6 text-primary" /> },
        { label: 'Total Students', value: '180', icon: <Users className="w-6 h-6 text-secondary" /> },
        { label: 'Pending Assignments', value: '12', icon: <ClipboardCheck className="w-6 h-6 text-warning" /> },
        { label: 'Classes Today', value: '4', icon: <Clock className="w-6 h-6 text-success" /> },
    ];

    const todaySchedule = [
        { time: '9:00 AM', class: 'Mathematics - Class 10A', room: 'Room 101' },
        { time: '10:30 AM', class: 'Mathematics - Class 9B', room: 'Room 102' },
        { time: '1:00 PM', class: 'Mathematics - Class 11A', room: 'Room 201' },
        { time: '3:00 PM', class: 'Mathematics - Class 12B', room: 'Room 301' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text">Welcome, Teacher!</h1>
                <p className="text-text-muted">Here's your teaching overview for today</p>
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
                        <Calendar className="w-5 h-5 text-primary" />Today's Schedule
                    </h2>
                    <div className="space-y-3">
                        {todaySchedule.map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted">
                                <span className="text-sm font-medium w-20 text-primary">{item.time}</span>
                                <div>
                                    <p className="text-sm font-medium text-text">{item.class}</p>
                                    <p className="text-xs text-text-muted">{item.room}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl p-6 bg-card border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
                        <Bell className="w-5 h-5 text-warning" />Pending Tasks
                    </h2>
                    <div className="space-y-3">
                        {['Grade Class 10A assignments', 'Submit attendance for Class 9B', 'Prepare quiz for Class 11A', 'Parent meeting at 5 PM'].map((task, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary" />
                                <p className="text-sm text-text">{task}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
