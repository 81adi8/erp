import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    UserCheck,
    Search,
    ChevronRight,
    Save,
    AlertCircle,
    CheckCircle2,
    BookOpen,
    Users,
    Calendar,
    Hash
} from 'lucide-react';
import {
    Card,
    Button,
    Input,
    LoadingSpinner,
    PageHeader,
} from '@erp/common';
import { useGetStudentsQuery, useEnrollStudentMutation } from '@core/api/endpoints/studentsApi';
import { useGetAcademicSessionsQuery, useGetClassesQuery, useGetSectionsQuery } from '@core/api/endpoints/academicsApi';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatApiError } from '@/common/services/apiHelpers';

export default function StudentEnrollmentPage() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Check if coming from Admission with studentId
    const queryParams = new URLSearchParams(location.search);
    const initialStudentId = queryParams.get('studentId') || '';

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
    
    // Form State
    const [enrollmentData, setEnrollmentData] = useState({
        academicYearId: '',
        classId: '',
        sectionId: '',
        rollNumber: '',
        remarks: '',
        isRepeater: false
    });

    // API Hooks
    const { data: studentsRes, isLoading: isLoadingStudents } = useGetStudentsQuery({ search: searchTerm }, { skip: searchTerm.length < 3 && !selectedStudentId });
    const { data: sessionsRes } = useGetAcademicSessionsQuery({});
    const { data: classesRes } = useGetClassesQuery({});
    const { data: sectionsRes } = useGetSectionsQuery({ classId: enrollmentData.classId }, { skip: !enrollmentData.classId });
    
    const [enrollStudent, { isLoading: isSubmitting }] = useEnrollStudentMutation();

    const selectedStudent = useMemo(() => {
        if (!selectedStudentId) return null;
        return studentsRes?.data.find(s => s.id === selectedStudentId);
    }, [selectedStudentId, studentsRes]);

    const handleEnroll = async () => {
        if (!selectedStudentId || !enrollmentData.classId || !enrollmentData.sectionId || !enrollmentData.academicYearId) {
            alert('Please fill all required fields');
            return;
        }

        try {
            await enrollStudent({
                studentId: selectedStudentId,
                ...enrollmentData
            }).unwrap();
            
            alert('Student enrolled successfully!');
            navigate('/admin/students');
        } catch (error) {
            console.error('Enrollment failed:', error);
            alert(formatApiError(error));
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <PageHeader
                title="Student Enrollment"
                description="Assign student to an academic session, class, and section"
                icon={UserCheck}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Student Selection */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Search size={16} /> 1. Select Student
                        </h3>
                        
                        {!selectedStudentId ? (
                            <div className="space-y-4">
                                <Input 
                                    placeholder="Search by name or email..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full"
                                />
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {isLoadingStudents && <LoadingSpinner size="sm" />}
                                    {studentsRes?.data.map(student => (
                                        <button
                                            key={student.id}
                                            onClick={() => setSelectedStudentId(student.id)}
                                            className="w-full p-3 text-left border rounded-lg hover:border-primary hover:bg-primary/5 transition-all space-y-1"
                                        >
                                            <p className="font-medium">{student.user?.first_name} {student.user?.last_name}</p>
                                            <p className="text-xs text-muted-foreground">{student.admission_number} | {student.user?.email}</p>
                                        </button>
                                    ))}
                                    {searchTerm.length >= 3 && studentsRes?.data.length === 0 && (
                                        <p className="text-center py-4 text-xs text-muted-foreground">No students found.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <UserCheck size={64} />
                                </div>
                                <div className="relative z-10 flex flex-col items-center text-center space-y-2">
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                                        {selectedStudent?.user?.first_name?.[0]}{selectedStudent?.user?.last_name?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold">{selectedStudent?.user?.first_name} {selectedStudent?.user?.last_name}</p>
                                        <p className="text-xs text-muted-foreground">ID: {selectedStudent?.admission_number}</p>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-[10px] h-7"
                                        onClick={() => setSelectedStudentId('')}
                                    >Change Student</Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {selectedStudent && selectedStudent.enrollments && selectedStudent.enrollments.length > 0 && (
                        <Card className="p-4 border-amber-200 bg-amber-50">
                            <h4 className="text-xs font-bold text-amber-800 uppercase mb-2 flex items-center gap-1">
                                <AlertCircle size={14} /> Current Status
                            </h4>
                            <div className="space-y-2">
                                {selectedStudent.enrollments.filter(e => e.status === 'active').map(e => (
                                    <div key={e.id} className="text-xs text-amber-900 leading-relaxed">
                                        Already enrolled in <strong>Class {e.class_id}</strong> for current session. 
                                        Enrolling now will deactivate the previous record.
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right Column: Academic Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6 space-y-8">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <BookOpen size={20} className="text-primary" /> 2. Academic Assignment
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs font-medium">
                                <Calendar size={14} /> New Enrollment
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Session Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <Calendar size={16} className="text-muted-foreground" /> Academic Session *
                                </label>
                                <select 
                                    className="w-full h-11 px-4 rounded-xl border-input bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    value={enrollmentData.academicYearId}
                                    onChange={(e) => setEnrollmentData(prev => ({ ...prev, academicYearId: e.target.value }))}
                                >
                                    <option value="">Select Session</option>
                                    {sessionsRes?.data.map(session => (
                                        <option key={session.id} value={session.id}>{session.name} {session.is_active ? '(Active)' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Class Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <Users size={16} className="text-muted-foreground" /> Admission to Class *
                                </label>
                                <select 
                                    className="w-full h-11 px-4 rounded-xl border-input bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    value={enrollmentData.classId}
                                    onChange={(e) => setEnrollmentData(prev => ({ ...prev, classId: e.target.value, sectionId: '' }))}
                                >
                                    <option value="">Select Class</option>
                                    {classesRes?.data.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Section Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <Hash size={16} className="text-muted-foreground" /> Section *
                                </label>
                                <select 
                                    className="w-full h-11 px-4 rounded-xl border-input bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    value={enrollmentData.sectionId}
                                    disabled={!enrollmentData.classId}
                                    onChange={(e) => setEnrollmentData(prev => ({ ...prev, sectionId: e.target.value }))}
                                >
                                    <option value="">Select Section</option>
                                    {sectionsRes?.data.map(section => (
                                        <option key={section.id} value={section.id}>{section.name}</option>
                                    ))}
                                </select>
                                {!enrollmentData.classId && <p className="text-[10px] text-muted-foreground italic">Select class first</p>}
                            </div>

                            {/* Roll Number */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <Hash size={16} className="text-muted-foreground" /> Roll Number
                                </label>
                                <Input 
                                    placeholder="Enter roll no (optional)" 
                                    value={enrollmentData.rollNumber}
                                    onChange={(e) => setEnrollmentData(prev => ({ ...prev, rollNumber: e.target.value }))}
                                    className="h-11 rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Additional Options */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    id="isRepeater"
                                    checked={enrollmentData.isRepeater}
                                    onChange={(e) => setEnrollmentData(prev => ({ ...prev, isRepeater: e.target.checked }))}
                                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                />
                                <label htmlFor="isRepeater" className="text-sm font-medium cursor-pointer">
                                    Is this student repeating this class?
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Enrollment Remarks</label>
                                <textarea 
                                    className="w-full min-h-[100px] p-4 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="Any notes about this specific enrollment year..."
                                    value={enrollmentData.remarks}
                                    onChange={(e) => setEnrollmentData(prev => ({ ...prev, remarks: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end gap-3 pt-6 border-t">
                            <Button variant="outline" onClick={() => navigate('/admin/students')}>Cancel</Button>
                            <Button 
                                onClick={handleEnroll}
                                disabled={isSubmitting || !selectedStudentId}
                                className="min-w-[160px] bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20"
                            >
                                {isSubmitting ? <LoadingSpinner size="sm" /> : (
                                    <>
                                        <Save size={18} className="mr-2" />
                                        Complete Enrollment
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>

                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-3 text-indigo-900">
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        </motion.div>
                        <p className="text-xs leading-relaxed">
                            <strong>Note:</strong> Enrollment assigns the student to a specific class group for the academic year. 
                            This enables them to appear in attendance sheets, marklists, and fee records.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
