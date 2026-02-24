// Teacher Schedule Page - Using Tailwind Theme Classes
import { motion } from 'framer-motion';
import { Clock, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ScheduleItem {
    id: string;
    time: string;
    endTime: string;
    subject: string;
    class: string;
    room: string;
    students: number;
}

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const mockSchedule: Record<string, ScheduleItem[]> = {
    Monday: [
        { id: '1', time: '9:00 AM', endTime: '10:00 AM', subject: 'Mathematics', class: 'Class 10A', room: 'Room 101', students: 30 },
        { id: '2', time: '10:30 AM', endTime: '11:30 AM', subject: 'Mathematics', class: 'Class 9B', room: 'Room 102', students: 28 },
        { id: '3', time: '1:00 PM', endTime: '2:00 PM', subject: 'Physics Lab', class: 'Class 11A', room: 'Lab 201', students: 24 },
    ],
    Tuesday: [
        { id: '4', time: '8:30 AM', endTime: '9:30 AM', subject: 'Mathematics', class: 'Class 12B', room: 'Room 301', students: 25 },
        { id: '5', time: '11:00 AM', endTime: '12:00 PM', subject: 'Mathematics', class: 'Class 10A', room: 'Room 101', students: 30 },
    ],
    Wednesday: [
        { id: '6', time: '9:00 AM', endTime: '10:00 AM', subject: 'Algebra', class: 'Class 11A', room: 'Room 201', students: 28 },
        { id: '7', time: '2:00 PM', endTime: '3:00 PM', subject: 'Geometry', class: 'Class 9B', room: 'Room 102', students: 28 },
        { id: '8', time: '3:30 PM', endTime: '4:30 PM', subject: 'Calculus', class: 'Class 12B', room: 'Room 301', students: 25 },
    ],
    Thursday: [
        { id: '9', time: '9:00 AM', endTime: '10:00 AM', subject: 'Mathematics', class: 'Class 10A', room: 'Room 101', students: 30 },
        { id: '10', time: '11:00 AM', endTime: '12:00 PM', subject: 'Physics', class: 'Class 11A', room: 'Lab 201', students: 24 },
    ],
    Friday: [
        { id: '11', time: '10:00 AM', endTime: '11:00 AM', subject: 'Mathematics', class: 'Class 9B', room: 'Room 102', students: 28 },
        { id: '12', time: '1:00 PM', endTime: '2:00 PM', subject: 'Mathematics', class: 'Class 12B', room: 'Room 301', students: 25 },
    ],
    Saturday: [
        { id: '13', time: '9:00 AM', endTime: '10:30 AM', subject: 'Remedial Class', class: 'All Students', room: 'Hall A', students: 40 },
    ],
};

export default function SchedulePage() {
    const [selectedDay, setSelectedDay] = useState('Monday');
    const todaySchedule = mockSchedule[selectedDay] || [];

    const totalClasses = Object.values(mockSchedule).flat().length;
    const todayClasses = todaySchedule.length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">My Schedule</h1>
                    <p className="text-text-muted">View and manage your teaching schedule</p>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                    <Clock className="w-4 h-4" />
                    <span>{totalClasses} classes this week</span>
                </div>
            </div>

            {/* Week Navigation */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 overflow-x-auto pb-2">
                {weekDays.map((day) => (
                    <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                            ${selectedDay === day
                                ? 'bg-secondary text-white'
                                : 'bg-card border border-border text-text-secondary hover:bg-muted'}`}
                    >
                        {day}
                        <span className="ml-2 text-xs opacity-75">({mockSchedule[day]?.length || 0})</span>
                    </button>
                ))}
            </motion.div>

            {/* Schedule Cards */}
            <div className="grid gap-4">
                {todaySchedule.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-8 bg-card border border-border text-center">
                        <Clock className="w-12 h-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-text mb-2">No Classes</h3>
                        <p className="text-text-muted">You have no scheduled classes on {selectedDay}</p>
                    </motion.div>
                ) : (
                    todaySchedule.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="rounded-xl p-5 bg-card border border-border hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Time */}
                                <div className="flex items-center gap-3 md:w-40">
                                    <div className="p-2 rounded-lg bg-secondary/10">
                                        <Clock className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-text">{item.time}</p>
                                        <p className="text-sm text-text-muted">to {item.endTime}</p>
                                    </div>
                                </div>

                                {/* Subject & Class */}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-text">{item.subject}</h3>
                                    <p className="text-text-secondary">{item.class}</p>
                                </div>

                                {/* Room & Students */}
                                <div className="flex items-center gap-6 text-text-muted">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-sm">{item.room}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        <span className="text-sm">{item.students} students</span>
                                    </div>
                                </div>

                                {/* Action */}
                                <button className="px-4 py-2 rounded-lg bg-muted text-text-secondary text-sm font-medium hover:bg-muted-foreground/10 transition-colors">
                                    View Details
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Summary */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl p-4 bg-card border border-border">
                    <p className="text-sm text-text-muted mb-1">Today's Classes</p>
                    <p className="text-2xl font-bold text-text">{todayClasses}</p>
                </div>
                <div className="rounded-xl p-4 bg-card border border-border">
                    <p className="text-sm text-text-muted mb-1">Total Students Today</p>
                    <p className="text-2xl font-bold text-text">{todaySchedule.reduce((acc, item) => acc + item.students, 0)}</p>
                </div>
                <div className="rounded-xl p-4 bg-card border border-border">
                    <p className="text-sm text-text-muted mb-1">Teaching Hours</p>
                    <p className="text-2xl font-bold text-text">{todayClasses} hr</p>
                </div>
            </motion.div>
        </div>
    );
}
