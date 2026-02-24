/**
 * Marks View Page
 * Shows child's exam marks and grades
 */
import { motion } from 'framer-motion';
import { FileText, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { useParent } from '../context/ParentContext';
import { useGetChildMarksQuery } from '../../../api/parentPortalApi';
import { LoadingSpinner } from '@erp/common';

export default function MarksViewPage() {
    const { selectedChild } = useParent();
    const childId = selectedChild?.id || '';

    const { data: marksData, isLoading, isError } = useGetChildMarksQuery(childId, { skip: !childId });

    const marks = marksData?.data || [];

    // Calculate stats
    const totalMarks = marks.reduce((sum, m) => sum + m.marks_obtained, 0);
    const totalMaxMarks = marks.reduce((sum, m) => sum + m.max_marks, 0);
    const avgPercentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0;

    // Group by exam
    const examGroups = marks.reduce((acc, m) => {
        const examName = m.exam_name || 'Unknown Exam';
        if (!acc[examName]) acc[examName] = [];
        acc[examName].push(m);
        return acc;
    }, {} as Record<string, typeof marks>);

    if (!selectedChild) {
        return <div className="text-center py-8 text-muted-foreground">No child selected</div>;
    }

    if (isLoading) {
        return <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>;
    }

    if (isError) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center">
                Failed to load marks data
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{marks.length}</p>
                    <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-success">{avgPercentage}%</p>
                    <p className="text-xs text-muted-foreground">Average</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{Object.keys(examGroups).length}</p>
                    <p className="text-xs text-muted-foreground">Exams</p>
                </div>
            </div>

            {/* Performance Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4"
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Overall Performance</span>
                    <span className="text-sm font-bold text-primary">{avgPercentage}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all ${
                            avgPercentage >= 80 ? 'bg-emerald-500' : 
                            avgPercentage >= 60 ? 'bg-primary' : 
                            avgPercentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${avgPercentage}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
            </motion.div>

            {/* Marks by Exam */}
            {Object.entries(examGroups).length > 0 ? (
                Object.entries(examGroups).map(([examName, examMarks], idx) => (
                    <motion.div
                        key={examName}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-card border border-border rounded-xl overflow-hidden"
                    >
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">{examName}</h3>
                            <FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="divide-y divide-border">
                            {examMarks.map((mark) => {
                                const percentage = Math.round((mark.marks_obtained / mark.max_marks) * 100);
                                return (
                                    <div key={mark.id} className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-medium text-foreground text-sm">{mark.subject_name || 'Subject'}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">
                                                    {mark.marks_obtained}/{mark.max_marks}
                                                </span>
                                                {mark.grade && (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium
                                                        ${percentage >= 80 ? 'bg-emerald-100 text-emerald-700' : 
                                                          percentage >= 60 ? 'bg-primary/10 text-primary' : 
                                                          percentage >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                        {mark.grade}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${
                                                    percentage >= 80 ? 'bg-emerald-500' : 
                                                    percentage >= 60 ? 'bg-primary' : 
                                                    percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        {mark.remarks && (
                                            <p className="text-xs text-muted-foreground mt-2">{mark.remarks}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                ))
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No marks recorded yet</p>
                </div>
            )}
        </div>
    );
}
