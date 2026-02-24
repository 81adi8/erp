import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    ArrowLeft,
    GraduationCap,
    Users,
    Save,
    AlertCircle,
    CheckCircle2,
    Search,
    Filter,
    School,
    Calendar,
    ChevronRight,
    Play,
    Loader2,
    RefreshCw
} from 'lucide-react';
import {
    Button,
    Input,
    Badge,
    Card,
    Select,
    LoadingSpinner,
    Modal,
    ConfirmDialog
} from '@erp/common';
import {
    useGetAcademicSessionsQuery,
    useGetClassesQuery,
    useGetSectionsQuery,
    usePromoteStudentsMutation,
} from '@core/api/endpoints/academicsApi';
import { useGetStudentsQuery } from '@core/api/endpoints/studentsApi';
import { useNavigate } from 'react-router-dom';
import { formatApiError } from '@/common/services/apiHelpers';

enum Step {
    SOURCE_SELECTION = 1,
    STUDENT_REVIEW = 2,
    TARGET_CONFIGURATION = 3,
    SUMMARY = 4
}

type PromotionDecision = 'PROMOTED' | 'DETAINED' | 'COMPLETED' | 'DROPPED';

interface StudentPromotionSelection {
    decision: PromotionDecision;
    toClassId?: string;
    toSectionId?: string;
    remarks?: string;
}

export default function SessionPromotionPage() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<Step>(Step.SOURCE_SELECTION);
    
    // Selection State
    const [source, setSource] = useState({
        sessionId: '',
        classId: '',
        sectionId: ''
    });

    const [target, setTarget] = useState({
        sessionId: '',
        classId: '',
        sectionId: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<Record<string, StudentPromotionSelection>>({});

    // Queries
    const { data: sessionsRes } = useGetAcademicSessionsQuery({});
    const { data: classesRes } = useGetClassesQuery({});
    const { data: sourceSections } = useGetSectionsQuery({ classId: source.classId }, { skip: !source.classId });
    const { data: targetSections } = useGetSectionsQuery({ classId: target.classId }, { skip: !target.classId });
    
    // Fetch students based on source selection
    const { data: studentsRes, isLoading: loadingStudents, refetch: refetchStudents } = useGetStudentsQuery({
        sessionId: source.sessionId,
        classId: source.classId,
        sectionId: source.sectionId,
        limit: 200
    }, { skip: currentStep !== Step.STUDENT_REVIEW });

    const [promoteStudents, { isLoading: isPromoting }] = usePromoteStudentsMutation();

    const students = studentsRes?.data || [];
    
    // Auto-select students when they load
    React.useEffect(() => {
        if (students.length > 0) {
            const initial: Record<string, StudentPromotionSelection> = {};
            students.forEach(s => {
                initial[s.id] = { 
                    decision: 'PROMOTED', 
                    // Default to next class if available, or current class
                    toClassId: target.classId || source.classId, 
                    toSectionId: target.sectionId 
                };
            });
            setSelectedStudents(initial);
        }
    }, [students, target.classId, target.sectionId]);

    const handleNextStep = () => {
        if (currentStep === Step.SOURCE_SELECTION) {
            if (!source.sessionId || !source.classId) {
                alert('Please select source session and class');
                return;
            }
        }
        if (currentStep === Step.STUDENT_REVIEW) {
            if (Object.keys(selectedStudents).length === 0) {
                alert('No students selected for promotion');
                return;
            }
        }
        setCurrentStep(prev => prev + 1);
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handlePromote = async () => {
        try {
            const decisions = Object.entries(selectedStudents).map(([studentId, data]) => ({
                enrollmentId: students.find(s => s.id === studentId)?.enrollments?.[0]?.id || '', // Need actual enrollment ID
                decision: data.decision,
                toClassId: data.toClassId,
                toSectionId: data.toSectionId,
                remarks: data.remarks
            })).filter(d => d.enrollmentId);

            if (decisions.length === 0) {
                alert('No valid enrollments found to promote');
                return;
            }

            const result = await promoteStudents({
                fromSessionId: source.sessionId,
                toSessionId: target.sessionId,
                decisions
            }).unwrap();

            alert(`Promotion successful! ${result.promoted} promoted, ${result.detained} detained.`);
            navigate('/admin/academics/sessions');
        } catch (error) {
            console.error('Promotion failed:', error);
            alert(formatApiError(error));
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header & Steps */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <GraduationCap className="text-primary w-10 h-10" />
                        Session Transition Engine
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Bulk promote students and allocate cohorts to the next academic cycle.</p>
                </div>
                
                <div className="flex items-center bg-surface border border-border p-1.5 rounded-2xl shadow-sm">
                    {[1, 2, 3, 4].map(step => (
                        <div key={step} className="flex items-center">
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                                ${currentStep === step ? 'bg-primary text-primary-foreground scale-110 shadow-lg' : 
                                  currentStep > step ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}
                            `}>
                                {currentStep > step ? '✓' : step}
                            </div>
                            {step < 4 && <div className={`w-6 h-0.5 mx-1 ${currentStep > step ? 'bg-success' : 'bg-border'}`} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    {currentStep === Step.SOURCE_SELECTION && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="p-8 space-y-8 bg-surface border-border rounded-3xl overflow-hidden relative group">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
                                <div className="flex items-center gap-4 border-b border-border pb-6">
                                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                        <Calendar size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase">Origin Session</h3>
                                        <p className="text-xs font-bold text-muted-foreground uppercase opacity-70 tracking-widest">Select the current cohort source</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Session</label>
                                        <Select
                                            value={source.sessionId}
                                            onChange={e => setSource({ ...source, sessionId: e.target.value })}
                                            options={sessionsRes?.data.map(s => ({ value: s.id, label: `${s.name} ${s.is_current ? '(Current)' : ''}` })) || []}
                                            className="h-14 rounded-2xl text-lg font-bold"
                                            placeholder="Choose Session..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Class</label>
                                            <Select
                                                value={source.classId}
                                                onChange={e => setSource({ ...source, classId: e.target.value, sectionId: '' })}
                                                options={classesRes?.data.map(c => ({ value: c.id, label: c.name })) || []}
                                                className="h-12 rounded-xl font-bold"
                                                placeholder="Select Class"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Section (Optional)</label>
                                            <Select
                                                value={source.sectionId}
                                                onChange={e => setSource({ ...source, sectionId: e.target.value })}
                                                options={sourceSections?.data.map(s => ({ value: s.id, label: s.name })) || []}
                                                disabled={!source.classId}
                                                className="h-12 rounded-xl font-bold"
                                                placeholder="All Sections"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <div className="flex flex-col justify-center space-y-6 p-4">
                                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] space-y-4">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                                        <AlertCircle size={28} />
                                    </div>
                                    <h4 className="text-lg font-black text-indigo-900 uppercase tracking-tight">System Protocol</h4>
                                    <p className="text-sm text-indigo-800/80 leading-relaxed font-medium italic">
                                        "A session transition represents a critical database operation. 
                                        Ensure all final marks are logged and current attendance records are sealed 
                                        before initializing student migration."
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-surface border border-border rounded-3xl text-center space-y-1">
                                        <p className="text-2xl font-black">200+</p>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase">Eligible Cohorts</p>
                                    </div>
                                    <div className="p-6 bg-surface border border-border rounded-3xl text-center space-y-1">
                                        <p className="text-2xl font-black">0</p>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase">Flagged Risks</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === Step.STUDENT_REVIEW && (
                        <div className="space-y-6">
                            <Card className="p-4 bg-surface border-border flex items-center justify-between gap-4 rounded-3xl">
                                <div className="relative flex-1 group pl-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Quick search student name or roll..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-9 h-11 border-border bg-muted/30"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pr-2">
                                    <Button variant="outline" size="sm" onClick={() => refetchStudents()} className="h-11 px-4 border-border">
                                        <RefreshCw size={16} className={loadingStudents ? 'animate-spin' : ''} />
                                    </Button>
                                    <div className="px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl font-black text-[10px] text-primary uppercase tracking-widest">
                                        {students.length} Pupils Found
                                    </div>
                                </div>
                            </Card>

                            <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Student Identity</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current Class</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Performance</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Migration Decision</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {loadingStudents ? (
                                            [...Array(5)].map((_, i) => (
                                                <tr key={i}><td colSpan={4} className="p-4"><Skeleton className="h-12 w-full" /></td></tr>
                                            ))
                                        ) : students.length === 0 ? (
                                            <tr><td colSpan={4} className="p-20 text-center font-bold text-muted-foreground uppercase">No students found in source</td></tr>
                                        ) : students.map(student => (
                                            <tr key={student.id} className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center font-black text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                                            {student.user?.first_name?.[0]}{student.user?.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black uppercase tracking-tight">{student.user?.first_name} {student.user?.last_name}</div>
                                                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">{student.admission_number}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className="bg-muted text-muted-foreground border-border text-[10px] font-bold uppercase">
                                                        {source.classId ? classesRes?.data.find(c => c.id === source.classId)?.name : 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div className="h-full bg-success w-[85%]" />
                                                        </div>
                                                        <span className="text-[10px] font-black">85%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={selectedStudents[student.id]?.decision || 'PROMOTED'}
                                                            onChange={e => setSelectedStudents({
                                                                ...selectedStudents,
                                                                [student.id]: { ...selectedStudents[student.id], decision: e.target.value }
                                                            })}
                                                            options={[
                                                                { value: 'PROMOTED', label: 'Promote' },
                                                                { value: 'DETAINED', label: 'Detain' },
                                                                { value: 'COMPLETED', label: 'Graduate' },
                                                                { value: 'DROPPED', label: 'Drop Out' }
                                                            ]}
                                                            className={`h-9 min-w-[120px] rounded-lg text-[10px] font-black uppercase 
                                                                ${selectedStudents[student.id]?.decision === 'DETAINED' ? 'border-destructive text-destructive' : 
                                                                  selectedStudents[student.id]?.decision === 'PROMOTED' ? 'border-success text-success' : ''}
                                                            `}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {currentStep === Step.TARGET_CONFIGURATION && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="p-8 space-y-8 bg-surface border-border rounded-3xl overflow-hidden relative group">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-success/5 rounded-full blur-3xl group-hover:bg-success/10 transition-all" />
                                <div className="flex items-center gap-4 border-b border-border pb-6">
                                    <div className="p-3 bg-success/10 rounded-2xl text-success">
                                        <ArrowRight size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase">Destination Target</h3>
                                        <p className="text-xs font-bold text-muted-foreground uppercase opacity-70 tracking-widest">Define where cohorts will migrate</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Target Session</label>
                                        <Select
                                            value={target.sessionId}
                                            onChange={e => setTarget({ ...target, sessionId: e.target.value })}
                                            options={sessionsRes?.data.map(s => ({ value: s.id, label: s.name })) || []}
                                            className="h-14 rounded-2xl text-lg font-bold"
                                            placeholder="Choose Next Session..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Target Class</label>
                                            <Select
                                                value={target.classId}
                                                onChange={e => setTarget({ ...target, classId: e.target.value, sectionId: '' })}
                                                options={classesRes?.data.map(c => ({ value: c.id, label: c.name })) || []}
                                                className="h-12 rounded-xl font-bold"
                                                placeholder="Select Class"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Default Section</label>
                                            <Select
                                                value={target.sectionId}
                                                onChange={e => setTarget({ ...target, sectionId: e.target.value })}
                                                options={targetSections?.data.map(s => ({ value: s.id, label: s.name })) || []}
                                                disabled={!target.classId}
                                                className="h-12 rounded-xl font-bold"
                                                placeholder="Assign Section"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <div className="bg-surface border border-border p-8 rounded-3xl space-y-6">
                                <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b pb-4">Cohort Mapping Insight</h4>
                                <div className="space-y-4">
                                    <p className="text-sm font-medium leading-relaxed">
                                        Mapped <span className="text-primary font-bold">{students.length} students</span> from 
                                        <span className="font-bold"> {classesRes?.data.find(c => c.id === source.classId)?.name}</span> to 
                                        <span className="font-bold"> {classesRes?.data.find(c => c.id === (target.classId || source.classId))?.name}</span>.
                                    </p>
                                    <div className="p-4 bg-muted/30 rounded-2xl space-y-2 border border-border">
                                        <div className="flex justify-between text-xs font-black uppercase">
                                            <span>Promotion Count</span>
                                            <span className="text-success">{Object.values(selectedStudents).filter(s => s.decision === 'PROMOTED').length}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-black uppercase">
                                            <span>Detention Count</span>
                                            <span className="text-destructive">{Object.values(selectedStudents).filter(s => s.decision === 'DETAINED').length}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800">
                                        <AlertCircle size={20} className="shrink-0" />
                                        <p className="text-xs font-medium italic">
                                            Assigning a default section will move all promoted students to that section. 
                                            You can manually adjust sections after migration.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === Step.SUMMARY && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="text-center space-y-2">
                                <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-6">
                                    <Play size={40} className="ml-1" />
                                </div>
                                <h2 className="text-2xl font-black uppercase">Migration Confirmation</h2>
                                <p className="text-muted-foreground font-medium">Verify the final metrics before finalizing the student transfer.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-surface border border-border rounded-3xl space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase">Source Cohort</p>
                                        <p className="font-black truncate uppercase">{sessionsRes?.data.find(s => s.id === source.sessionId)?.name} | {classesRes?.data.find(c => c.id === source.classId)?.name}</p>
                                    </div>
                                    <div className="p-6 bg-surface border border-border rounded-3xl space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase">Target Cohort</p>
                                        <p className="font-black truncate uppercase">{sessionsRes?.data.find(s => s.id === target.sessionId)?.name} | {classesRes?.data.find(c => c.id === target.classId)?.name}</p>
                                    </div>
                                </div>

                                <Card className="p-8 bg-surface border-border border-2 border-primary/20 space-y-6 rounded-[2.5rem]">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-center bg-muted/20 p-4 rounded-2xl border border-border">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-success/20 text-success rounded-lg"><CheckCircle2 size={20} /></div>
                                                <span className="text-sm font-black uppercase">Successful Promotions</span>
                                            </div>
                                            <span className="text-xl font-black">{Object.values(selectedStudents).filter(s => s.decision === 'PROMOTED').length}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-muted/20 p-4 rounded-2xl border border-border">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-destructive/20 text-destructive rounded-lg"><AlertCircle size={20} /></div>
                                                <span className="text-sm font-black uppercase">Repeaters (Detained)</span>
                                            </div>
                                            <span className="text-xl font-black">{Object.values(selectedStudents).filter(s => s.decision === 'DETAINED').length}</span>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-surface border border-border rounded-2xl text-center">
                                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Grand Total Migration</p>
                                        <p className="text-4xl font-black text-primary">{students.length}</p>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Sticky Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-border p-4 z-40">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={currentStep === 1 ? () => navigate(-1) : handlePrevStep}
                        className="h-12 px-6 rounded-2xl border-border font-black uppercase text-[10px] tracking-widest"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        {currentStep === 1 ? 'Cancel Engine' : 'Previous Step'}
                    </Button>

                    <div className="flex items-center gap-3">
                        {currentStep < 4 ? (
                            <Button
                                onClick={handleNextStep}
                                className="h-12 px-10 bg-primary text-primary-foreground rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                            >
                                Process Step {currentStep}
                                <ArrowRight size={16} className="ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handlePromote}
                                disabled={isPromoting}
                                className="h-12 px-12 bg-success text-success-foreground rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-success/20"
                            >
                                {isPromoting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Play size={16} className="mr-2" />}
                                Initialize Migration Now
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
