import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Plus,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronRight,
    FileText,
    Library,
    CheckCircle,
    Circle,
    Clock,
    Link as LinkIcon,
    RefreshCw,
    Activity,
    BookCheck,
    Layers,
    Layout,
    Target,
    Zap,
    History
} from 'lucide-react';
import {
    Button,
    Input,
    Badge,
    Modal,
    ConfirmDialog,
    Select,
    Card,
    Skeleton,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from '@erp/common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    useGetSubjectsQuery,
    useGetChaptersQuery,
    useCreateChapterMutation,
    useUpdateChapterMutation,
    useDeleteChapterMutation,
    useCreateTopicMutation,
    useUpdateTopicMutation,
    useDeleteTopicMutation,
    useMarkTopicCompletedMutation,
} from '@core/api/endpoints/academicsApi';
import type { Chapter, Topic } from '@core/api/endpoints/academicsApi';
import {
    curriculumChapterSchema,
    curriculumTopicSchema,
    type CurriculumChapterFormData,
    type CurriculumTopicFormData,
} from '@/core/validation/schemas';

export default function CurriculumPage() {
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const { data: subjectsRes } = useGetSubjectsQuery({ limit: 100 });
    const { data: chaptersRes, isLoading: loadingChapters, isFetching, refetch: refetchChapters } = useGetChaptersQuery(selectedSubjectId, { skip: !selectedSubjectId });

    const [createChapter] = useCreateChapterMutation();
    const [updateChapter] = useUpdateChapterMutation();
    const [deleteChapter] = useDeleteChapterMutation();

    const [createTopic] = useCreateTopicMutation();
    const [updateTopic] = useUpdateTopicMutation();
    const [deleteTopic] = useDeleteTopicMutation();
    const [markTopicCompleted] = useMarkTopicCompletedMutation();

    const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmType, setConfirmType] = useState<'chapter' | 'topic'>('chapter');

    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState('basic');

    const {
        register: registerChapter,
        handleSubmit: handleChapterFormSubmit,
        reset: resetChapter,
        watch: watchChapter,
        formState: { errors: chapterErrors, isSubmitting: isChapterSubmitting },
    } = useForm<CurriculumChapterFormData>({
        resolver: zodResolver(curriculumChapterSchema),
        defaultValues: {
            name: '',
            description: '',
            display_order: 1,
            estimated_hours: 0,
            learning_outcomes: '',
        },
    });

    const {
        register: registerTopic,
        handleSubmit: handleTopicFormSubmit,
        reset: resetTopic,
        watch: watchTopic,
        formState: { errors: topicErrors, isSubmitting: isTopicSubmitting },
    } = useForm<CurriculumTopicFormData>({
        resolver: zodResolver(curriculumTopicSchema),
        defaultValues: {
            name: '',
            description: '',
            display_order: 1,
            estimated_hours: 0,
            resource_links: '',
        },
    });

    const toggleChapter = (chapterId: string) => {
        setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
    };

    const handleOpenCreateChapter = () => {
        setSelectedChapter(null);
        resetChapter({
            name: '',
            description: '',
            display_order: (chaptersRes?.data?.length || 0) + 1,
            estimated_hours: 0,
            learning_outcomes: '',
        });
        setActiveTab('basic');
        setIsChapterModalOpen(true);
    };

    const handleOpenEditChapter = (chapter: Chapter) => {
        setSelectedChapter(chapter);
        resetChapter({
            name: chapter.name,
            description: chapter.description || '',
            display_order: chapter.display_order,
            estimated_hours: chapter.estimated_hours || 0,
            learning_outcomes: chapter.learning_outcomes?.join('\n') || '',
        });
        setActiveTab('basic');
        setIsChapterModalOpen(true);
    };

    const handleChapterSubmit = async (chapterForm: CurriculumChapterFormData) => {
        try {
            const data = {
                ...chapterForm,
                subject_id: selectedSubjectId,
                display_order: chapterForm.display_order,
                estimated_hours: chapterForm.estimated_hours || 0,
                learning_outcomes: chapterForm.learning_outcomes.split('\n').filter(l => l.trim() !== '')
            };
            if (selectedChapter) {
                await updateChapter({ id: selectedChapter.id, data }).unwrap();
            } else {
                await createChapter(data).unwrap();
            }
            setIsChapterModalOpen(false);
        } catch (error) {
            console.error('Chapter operation failed:', error);
        }
    };

    const handleTopicSubmit = async (topicForm: CurriculumTopicFormData) => {
        if (!selectedChapter) return;
        try {
            let resourceLinks = [];
            try {
                resourceLinks = topicForm.resource_links ? JSON.parse(topicForm.resource_links) : [];
            } catch (e) {
                console.warn('Invalid JSON for resource links');
            }
            const data = {
                ...topicForm,
                chapter_id: selectedChapter.id,
                display_order: topicForm.display_order,
                estimated_hours: topicForm.estimated_hours || 0,
                resource_links: resourceLinks
            };
            if (selectedTopic) {
                await updateTopic({ id: selectedTopic.id, data }).unwrap();
            } else {
                await createTopic(data).unwrap();
            }
            setIsTopicModalOpen(false);
        } catch (error) {
            console.error('Topic operation failed:', error);
        }
    };

    const handleDelete = async () => {
        if (confirmType === 'chapter' && selectedChapter) {
            await deleteChapter(selectedChapter.id).unwrap();
        } else if (confirmType === 'topic' && selectedTopic) {
            await deleteTopic(selectedTopic.id).unwrap();
        }
        setIsConfirmOpen(false);
    };

    const totalTopics = chaptersRes?.data.reduce((acc, c) => acc + (c.topics?.length || 0), 0) || 0;
    const completedTopics = chaptersRes?.data.reduce((acc, c) => acc + (c.topics?.filter(t => t.is_completed).length || 0), 0) || 0;
    const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-[1400px] mx-auto space-y-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-surface border border-border rounded-xl shadow-sm text-primary">
                            <BookCheck size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground tracking-tight">Curriculum Ontology</h1>
                            <p className="text-muted-foreground text-xs font-medium">Map educational milestones and modules.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetchChapters()} disabled={isFetching || !selectedSubjectId} className="bg-surface border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                            Sync
                        </Button>
                        <Button
                            onClick={handleOpenCreateChapter}
                            disabled={!selectedSubjectId}
                            size="sm"
                            className="bg-primary text-primary-foreground border-0 shadow-sm hover:bg-primary/90"
                        >
                            <Plus size={16} className="mr-1" />
                            Append Milestone
                        </Button>
                    </div>
                </div>

                {/* Subject Selection */}
                <Card className="p-4 bg-surface border-border shadow-sm rounded-2xl relative overflow-hidden">
                    <div className="flex flex-col xl:flex-row gap-6 items-center">
                        <div className="flex flex-col gap-1.5 w-full xl:w-auto">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">Contextual Domain</span>
                            <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-4 py-1 border border-border min-w-[300px]">
                                <BookOpen size={16} className="text-primary" />
                                <Select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    options={[{ value: '', label: 'Select Pedagogical Domain' }, ...(subjectsRes?.data.map(s => ({ value: s.id, label: s.name.toUpperCase() })) || [])]}
                                    className="border-0 bg-transparent font-bold tracking-tight text-xs focus:ring-0 w-full text-foreground h-9 outline-none"
                                />
                            </div>
                        </div>

                        {selectedSubjectId && chaptersRes && (
                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-3 bg-muted/30 border border-border rounded-xl flex items-center gap-3">
                                    <div className="p-2 bg-surface shadow-sm border border-border rounded-lg text-primary">
                                        <Layers size={16} />
                                    </div>
                                    <div>
                                        <div className="text-base font-bold text-foreground">{chaptersRes.data.length}</div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase">Chapters</div>
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/30 border border-border rounded-xl flex items-center gap-3">
                                    <div className="p-2 bg-surface shadow-sm border border-border rounded-lg text-primary">
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <div className="text-base font-bold text-foreground">{totalTopics}</div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase">Learning Units</div>
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1.5 flex flex-col justify-center">
                                    <div className="flex justify-between items-center px-0.5">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none">Mapping Progress</span>
                                        <span className="text-[11px] font-bold text-primary leading-none">{progressPercent}%</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-primary" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Tree Structure */}
                <div className="space-y-4">
                    {!selectedSubjectId ? (
                        <div className="py-24 bg-surface border border-border border-dashed rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                            <BookOpen size={48} strokeWidth={1} className="text-muted-foreground/50" />
                            <p className="text-muted-foreground text-sm font-medium">Select a domain to render its structure.</p>
                        </div>
                    ) : loadingChapters ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {chaptersRes?.data.map((chapter) => (
                                <Card key={chapter.id} className="group overflow-hidden bg-surface border-border rounded-2xl transition-all">
                                    <div className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${expandedChapters[chapter.id] ? 'bg-muted/50' : 'hover:bg-muted/30'}`} onClick={() => toggleChapter(chapter.id)}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl transition-all ${expandedChapters[chapter.id] ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                                                <Layers size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Chapter {chapter.display_order}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground">{chapter.topics?.length || 0} Units • {chapter.estimated_hours || 0} Hr</span>
                                                </div>
                                                <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">{chapter.name}</h3>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedChapter(chapter); setSelectedTopic(null); resetTopic({ name: '', description: '', display_order: (chapter.topics?.length || 0) + 1, estimated_hours: 0, resource_links: '' }); setIsTopicModalOpen(true); }} className="p-1.5 hover:bg-surface text-success rounded-lg border border-transparent hover:border-success/20 shadow-sm transition-all"><Plus size={12} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenEditChapter(chapter); }} className="p-1.5 hover:bg-surface text-muted-foreground rounded-lg border border-transparent hover:border-border shadow-sm transition-all"><Edit2 size={12} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedChapter(chapter); setConfirmType('chapter'); setIsConfirmOpen(true); }} className="p-1.5 hover:bg-surface text-muted-foreground hover:text-destructive rounded-lg border border-transparent hover:border-destructive/20 shadow-sm transition-all"><Trash2 size={12} /></button>
                                            </div>
                                            <div className={`p-1.5 transition-all ${expandedChapters[chapter.id] ? 'text-primary' : 'text-muted-foreground'}`}>
                                                {expandedChapters[chapter.id] ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {expandedChapters[chapter.id] && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border">
                                                <div className="p-4 space-y-2 bg-muted/10">
                                                    {chapter.topics?.length ? chapter.topics.map((topic) => (
                                                        <div key={topic.id} className={`group/unit flex items-center justify-between p-3.5 bg-surface border border-border rounded-xl shadow-sm transition-all ${topic.is_completed ? 'bg-success/5' : ''}`}>
                                                            <div className="flex items-center gap-4">
                                                                <button onClick={() => markTopicCompleted({ id: topic.id, completed: !topic.is_completed })} className={`p-2 rounded-lg transition-all ${topic.is_completed ? 'bg-success text-success-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                                                                    {topic.is_completed ? <CheckCircle size={14} strokeWidth={3} /> : <Circle size={14} strokeWidth={3} />}
                                                                </button>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Unit {topic.display_order}</span>
                                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{topic.estimated_hours || 0}Hr</span>
                                                                    </div>
                                                                    <h4 className={`text-xs font-bold uppercase transition-all ${topic.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{topic.name}</h4>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover/unit:opacity-100 transition-all">
                                                                <button onClick={() => { setSelectedChapter(chapter); setSelectedTopic(topic); resetTopic({ name: topic.name, description: topic.description || '', display_order: topic.display_order, estimated_hours: topic.estimated_hours || 0, resource_links: JSON.stringify(topic.resource_links || [], null, 2) }); setIsTopicModalOpen(true); }} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg"><Edit2 size={12} /></button>
                                                                <button onClick={() => { setSelectedTopic(topic); setConfirmType('topic'); setIsConfirmOpen(true); }} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive rounded-lg"><Trash2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div className="py-6 flex flex-col items-center justify-center text-center opacity-50">
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Infrastructure Empty</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chapter Modal */}
            <Modal
                isOpen={isChapterModalOpen}
                onClose={() => setIsChapterModalOpen(false)}
                title={selectedChapter ? 'Edit Milestone' : 'Add Milestone'}
                size="lg"
            >
                <form onSubmit={handleChapterFormSubmit(handleChapterSubmit)} className="space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/50 rounded-lg">
                            <TabsTrigger value="basic" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Basic</TabsTrigger>
                            <TabsTrigger value="ontology" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Ontology</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 min-h-[260px]">
                            <TabsContent value="basic" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5 md:col-span-3">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Chapter Title *</label>
                                        <Input
                                            placeholder="Foundations of Science"
                                            {...registerChapter('name')}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={chapterErrors.name?.message}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Order</label>
                                        <Input
                                            type="number"
                                            {...registerChapter('display_order')}
                                            className="h-10 rounded-lg text-center font-bold bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={chapterErrors.display_order?.message}
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Delivery Target (Hours)</label>
                                        <Input
                                            type="number"
                                            step="0.5"
                                            placeholder="10.0"
                                            {...registerChapter('estimated_hours')}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={chapterErrors.estimated_hours?.message}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="ontology" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground ml-0.5">Milestone Summary</label>
                                    <textarea
                                        className="w-full min-h-[80px] p-3 text-sm bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 text-foreground"
                                        {...registerChapter('description')}
                                    />
                                    {chapterErrors.description && <p className="text-xs text-red-500">{chapterErrors.description.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground ml-0.5">Expected Transitions (Line Separated)</label>
                                    <textarea
                                        className="w-full min-h-[100px] p-3 text-[11px] font-bold bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 text-foreground"
                                        placeholder="..."
                                        {...registerChapter('learning_outcomes')}
                                    />
                                    {chapterErrors.learning_outcomes && <p className="text-xs text-red-500">{chapterErrors.learning_outcomes.message}</p>}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsChapterModalOpen(false)}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={isChapterSubmitting} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">{isChapterSubmitting ? 'Saving...' : 'Mount Milestone'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Topic Modal */}
            <Modal
                isOpen={isTopicModalOpen}
                onClose={() => setIsTopicModalOpen(false)}
                title={selectedTopic ? 'Edit Unit' : 'Append Unit'}
                size="md"
            >
                <form onSubmit={handleTopicFormSubmit(handleTopicSubmit)} className="space-y-4 pt-1">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-1.5 col-span-3">
                            <label className="text-xs font-semibold text-foreground">Unit Designation *</label>
                            <Input
                                {...registerTopic('name')}
                                className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                error={topicErrors.name?.message}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Rank</label>
                            <Input
                                type="number"
                                {...registerTopic('display_order')}
                                className="h-10 rounded-lg text-center bg-surface border-border text-foreground focus:ring-primary/20"
                                error={topicErrors.display_order?.message}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Estimated Duration (Hrs)</label>
                        <Input
                            type="number"
                            step="0.5"
                            {...registerTopic('estimated_hours')}
                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                            error={topicErrors.estimated_hours?.message}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Conceptual Summary</label>
                        <textarea
                            className="w-full min-h-[80px] p-3 text-sm bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 text-foreground"
                            {...registerTopic('description')}
                        />
                        {topicErrors.description && <p className="text-xs text-red-500">{topicErrors.description.message}</p>}
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsTopicModalOpen(false)}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={isTopicSubmitting} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">{isTopicSubmitting ? 'Saving...' : 'Commit Unit'}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Excise Node?"
                description="This will permanently delete the selected curriculum node and its children. Continue?"
                confirmLabel="Confirm Purge"
                variant="danger"
            />
        </div>
    );
}
