import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Search, RefreshCw, Plus, Trash2, Edit2, Loader2, Info } from 'lucide-react';
import {
    Button,
    Input,
    Badge,
    Skeleton,
} from '@erp/common';
import {
    useGetGlobalHolidaysQuery,
    useSyncGlobalHolidaysMutation,
    useUpsertGlobalHolidayMutation,
    useDeleteGlobalHolidayMutation,
    GlobalHoliday
} from '../services/endpoints/global-holidays';

export const GlobalHolidaysPage: React.FC = () => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchQuery, setSearchQuery] = useState('');
    const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState<Partial<GlobalHoliday> | null>(null);

    const { data: holidays, isLoading, isFetching } = useGetGlobalHolidaysQuery({ year: selectedYear });
    const [syncHolidays, { isLoading: isSyncing }] = useSyncGlobalHolidaysMutation();
    const [upsertHoliday, { isLoading: isSaving }] = useUpsertGlobalHolidayMutation();
    const [deleteHoliday] = useDeleteGlobalHolidayMutation();

    const filteredHolidays = useMemo(() => {
        if (!holidays) return [];
        return holidays.filter((h: GlobalHoliday) => 
            h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.type.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [holidays, searchQuery]);

    const handleSync = async () => {
        if (window.confirm(`Sync holidays for ${selectedYear} from Calendarific?`)) {
            try {
                await syncHolidays({ year: selectedYear }).unwrap();
            } catch (err) {
                console.error('Failed to sync holidays:', err);
            }
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            try {
                await deleteHoliday(id).unwrap();
            } catch (err) {
                console.error('Failed to delete holiday:', err);
            }
        }
    };

    const handleEdit = (holiday: GlobalHoliday) => {
        setSelectedHoliday(holiday);
        setIsUpsertModalOpen(true);
    };

    const handleAddManual = () => {
        setSelectedHoliday({
            year: selectedYear,
            country_code: 'IN',
            type: 'NATIONAL',
            date: `${selectedYear}-01-01`
        });
        setIsUpsertModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Global Holiday Repository</h1>
                        <p className="text-muted-foreground text-sm">Manage system-wide public holidays for all tenants.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                        {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    
                    <Button 
                        variant="outline" 
                        onClick={handleSync} 
                        disabled={isSyncing || isFetching}
                        className="gap-2"
                    >
                        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Sync {selectedYear}
                    </Button>
                    
                    <Button onClick={handleAddManual} className="gap-2 shadow-lg shadow-primary/20">
                        <Plus size={16} />
                        Add Manually
                    </Button>
                </div>
            </div>

            {/* Banner Info */}
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-start gap-3">
                <Info className="text-primary mt-0.5" size={18} />
                <div className="text-sm">
                    <p className="font-semibold text-primary mb-1">Centralized Intelligence</p>
                    <p className="text-muted-foreground leading-relaxed">
                        Holidays defined here are automatically available to all school tenants. 
                        When schools "Sync Smart Holidays," they reference these dates. 
                        Modifying a date here updates it for all connected schools globally.
                    </p>
                </div>
            </div>

            {/* Search & Stats */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                        placeholder="Search holidays by name or type..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="px-4 border-dashed">{filteredHolidays.length} Holidays Found</Badge>
                </div>
            </div>

            {/* Holiday Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Holiday Name</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Key</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            <AnimatePresence mode="popLayout">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={5} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td>
                                        </tr>
                                    ))
                                ) : filteredHolidays.length > 0 ? (
                                    filteredHolidays.map((h: GlobalHoliday) => (
                                        <motion.tr 
                                            key={h.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-muted/30 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs font-bold bg-primary/5 text-primary px-2 py-1 rounded inline-block">
                                                    {h.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold">{h.name}</div>
                                                <div className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs">{h.description}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={h.type.includes('NATIONAL') ? 'success' : 'default'} className="text-[10px]">
                                                    {h.type}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-mono opacity-50">{h.holiday_key}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(h)} className="h-8 w-8 !p-0">
                                                        <Edit2 size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(h.id, h.name)} className="h-8 w-8 !p-0 text-error hover:bg-error/10">
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="text-muted-foreground">No holidays found for {selectedYear}</div>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Edit/Upsert Modal could go here */}
            {isUpsertModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <h3 className="text-xl font-bold mb-4">{selectedHoliday?.id ? 'Edit Holiday' : 'Add Holiday'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Name</label>
                                <Input 
                                    value={selectedHoliday?.name || ''} 
                                    onChange={e => setSelectedHoliday({...selectedHoliday, name: e.target.value})}
                                    placeholder="e.g. Republic Day"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Date</label>
                                    <Input 
                                        type="date"
                                        value={selectedHoliday?.date || ''} 
                                        onChange={e => {
                                            const d = new Date(e.target.value);
                                            setSelectedHoliday({
                                                ...selectedHoliday, 
                                                date: e.target.value,
                                                year: d.getFullYear(),
                                                month: d.getMonth() + 1,
                                                day: d.getDate()
                                            })
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Type</label>
                                    <Input 
                                        value={selectedHoliday?.type || ''} 
                                        onChange={e => setSelectedHoliday({...selectedHoliday, type: e.target.value.toUpperCase()})}
                                        placeholder="NATIONAL, RELIGIOUS"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Description</label>
                                <Input 
                                    value={selectedHoliday?.description || ''} 
                                    onChange={e => setSelectedHoliday({...selectedHoliday, description: e.target.value})}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setIsUpsertModalOpen(false)}>Cancel</Button>
                                <Button 
                                    disabled={isSaving}
                                    onClick={async () => {
                                        try {
                                            await upsertHoliday(selectedHoliday!).unwrap();
                                            setIsUpsertModalOpen(false);
                                        } catch (err) {
                                            console.error('Failed to save:', err);
                                        }
                                    }}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Save Holiday'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
