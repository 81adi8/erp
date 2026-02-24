/**
 * Child Profile Page
 * Shows detailed student information
 */
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Hash, GraduationCap } from 'lucide-react';
import { useParent } from '../context/ParentContext';

export default function ChildProfilePage() {
    const { selectedChild } = useParent();

    if (!selectedChild) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No child selected
            </div>
        );
    }

    const profileItems = [
        { label: 'Full Name', value: `${selectedChild.firstName} ${selectedChild.lastName}`, icon: User },
        { label: 'Roll Number', value: selectedChild.rollNumber || 'Not assigned', icon: Hash },
        { label: 'Class', value: selectedChild.class_name || 'Not assigned', icon: BookOpen },
        { label: 'Section', value: selectedChild.section_name || 'Not assigned', icon: GraduationCap },
        { label: 'Relationship', value: selectedChild.relationship, icon: User },
    ];

    return (
        <div className="space-y-4">
            {/* Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-6 text-center"
            >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    {selectedChild.photo ? (
                        <img src={selectedChild.photo} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <User className="w-10 h-10 text-primary" />
                    )}
                </div>
                <h2 className="text-xl font-bold text-foreground">
                    {selectedChild.firstName} {selectedChild.lastName}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {selectedChild.class_name} {selectedChild.section_name && `• ${selectedChild.section_name}`}
                </p>
                {selectedChild.is_primary && (
                    <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        Primary Child
                    </span>
                )}
            </motion.div>

            {/* Profile Details */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
            >
                <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">Student Details</h3>
                </div>
                <div className="divide-y divide-border">
                    {profileItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-4">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <item.icon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                <p className="font-medium text-foreground">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-3"
            >
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary">90</p>
                    <p className="text-xs text-muted-foreground">Attendance %</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-success">85%</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
            </motion.div>
        </div>
    );
}