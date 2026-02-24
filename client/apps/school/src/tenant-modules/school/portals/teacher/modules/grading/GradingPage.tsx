// Teacher Grading Page - Using Tailwind Theme Classes
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, AlertCircle, Search, Filter } from 'lucide-react';
import { useState } from 'react';

interface Assignment {
    id: string;
    title: string;
    class: string;
    subject: string;
    dueDate: string;
    submitted: number;
    total: number;
    graded: number;
    status: 'pending' | 'partial' | 'complete';
}

const mockAssignments: Assignment[] = [
    { id: '1', title: 'Math Homework Ch.5', class: 'Class 10A', subject: 'Mathematics', dueDate: 'Dec 15, 2024', submitted: 28, total: 30, graded: 25, status: 'partial' },
    { id: '2', title: 'Physics Lab Report', class: 'Class 11A', subject: 'Physics', dueDate: 'Dec 18, 2024', submitted: 24, total: 28, graded: 0, status: 'pending' },
    { id: '3', title: 'Mid-Term Test', class: 'Class 9B', subject: 'Mathematics', dueDate: 'Dec 10, 2024', submitted: 32, total: 32, graded: 32, status: 'complete' },
    { id: '4', title: 'Chapter Quiz', class: 'Class 12B', subject: 'Mathematics', dueDate: 'Dec 20, 2024', submitted: 18, total: 25, graded: 10, status: 'partial' },
];

export default function GradingPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'partial' | 'complete'>('all');

    const filteredAssignments = mockAssignments.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.class.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || a.status === filter;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'complete': return 'bg-success text-white';
            case 'partial': return 'bg-warning text-white';
            case 'pending': return 'bg-error text-white';
            default: return 'bg-muted text-text';
        }
    };

    const stats = [
        { label: 'Total Assignments', value: mockAssignments.length, icon: <FileText className="w-5 h-5 text-primary" /> },
        { label: 'Fully Graded', value: mockAssignments.filter(a => a.status === 'complete').length, icon: <CheckCircle className="w-5 h-5 text-success" /> },
        { label: 'In Progress', value: mockAssignments.filter(a => a.status === 'partial').length, icon: <Clock className="w-5 h-5 text-warning" /> },
        { label: 'Pending', value: mockAssignments.filter(a => a.status === 'pending').length, icon: <AlertCircle className="w-5 h-5 text-error" /> },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text">Grading</h1>
                <p className="text-text-muted">Grade assignments and assessments</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className="rounded-xl p-4 bg-card border border-border flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-muted">{stat.icon}</div>
                        <div>
                            <p className="text-2xl font-bold text-text">{stat.value}</p>
                            <p className="text-sm text-text-muted">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search assignments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-text-muted" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as typeof filter)}
                        className="px-4 py-2 rounded-lg bg-card border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="partial">In Progress</option>
                        <option value="complete">Complete</option>
                    </select>
                </div>
            </div>

            {/* Assignments Table */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card border border-border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted">
                        <tr>
                            <th className="text-left p-4 text-text font-semibold">Assignment</th>
                            <th className="text-left p-4 text-text font-semibold hidden md:table-cell">Class</th>
                            <th className="text-left p-4 text-text font-semibold hidden lg:table-cell">Due Date</th>
                            <th className="text-left p-4 text-text font-semibold">Progress</th>
                            <th className="text-left p-4 text-text font-semibold">Status</th>
                            <th className="text-right p-4 text-text font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAssignments.map((assignment) => (
                            <tr key={assignment.id} className="border-t border-border hover:bg-muted/50">
                                <td className="p-4">
                                    <p className="font-medium text-text">{assignment.title}</p>
                                    <p className="text-sm text-text-muted md:hidden">{assignment.class}</p>
                                </td>
                                <td className="p-4 text-text-secondary hidden md:table-cell">{assignment.class}</td>
                                <td className="p-4 text-text-secondary hidden lg:table-cell">{assignment.dueDate}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full bg-secondary rounded-full"
                                                style={{ width: `${(assignment.graded / assignment.submitted) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-text-muted">{assignment.graded}/{assignment.submitted}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="px-4 py-2 rounded-lg bg-secondary text-white text-sm font-medium hover:bg-secondary-dark transition-colors">
                                        Grade
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </motion.div>
        </div>
    );
}
