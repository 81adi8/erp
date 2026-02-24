import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Loader2, Sparkles, LayoutGrid, List, X } from 'lucide-react';
import {
    Button,
    Input,
    PlanCard,
    Plan,
    Skeleton,
    Badge
} from '@erp/common';
import { useGetPlansQuery, useDeletePlanMutation } from '../services/endpoints';
// PlanModal
import { PlanModal } from '../components/PlanModal';

export const PlansPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | undefined>(undefined);

    const { data, isLoading, isError, refetch } = useGetPlansQuery();
    const [deletePlan] = useDeletePlanMutation();

    const plans = data?.data || [];
    
    // Memoize filtered plans to avoid re-calculation on varje re-render
    const filteredPlans = useMemo(() => {
        return plans.filter(plan =>
            plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            plan.slug.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [plans, searchQuery]);

    const handleCreate = useCallback(() => {
        setSelectedPlan(undefined);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((plan: Plan) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    }, []);

    const handleDelete = useCallback(async (plan: Plan) => {
        if (window.confirm(`Are you sure you want to delete the plan "${plan.name}"?`)) {
            try {
                await deletePlan(plan.id).unwrap();
            } catch (err) {
                console.error('Failed to delete plan:', err);
            }
        }
    }, [deletePlan]);

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-1"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Subscription Plans</h1>
                            <p className="text-muted-foreground text-sm">Manage your SaaS tiers, modules, and pricing models.</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 w-full md:w-auto"
                >
                    <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <Button onClick={handleCreate} className="flex-1 md:flex-none gap-2 shadow-lg shadow-primary/20 h-11 px-6">
                        <Plus size={18} />
                        Create New Plan
                    </Button>
                </motion.div>
            </div>

            {/* Actions & Filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col sm:flex-row gap-4 bg-card/50 p-4 rounded-xl border border-border/50 backdrop-blur-sm"
            >
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                        placeholder="Search plans by name or slug..."
                        className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="gap-2 border-border/50">
                    <Filter size={18} />
                    Filters
                </Button>
            </motion.div>

            {/* Plans List/Grid */}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className={viewMode === 'grid' ? "h-[400px]" : "h-24"}>
                                <Skeleton className="w-full h-full rounded-2xl" />
                            </div>
                        ))
                    ) : filteredPlans.length > 0 ? (
                        filteredPlans.map((plan) => (
                            viewMode === 'grid' ? (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            ) : (
                                <motion.div
                                    key={plan.id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="bg-card hover:bg-muted/30 border border-border p-4 rounded-xl flex items-center justify-between group transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover:bg-primary/10 transition-colors">
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{plan.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                                                <span>{plan.slug}</span>
                                                <span>•</span>
                                                <span className="text-primary font-semibold">${plan.price_monthly}/mo</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={plan.is_active ? 'success' : 'default'}>
                                            {plan.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)} className="h-8 w-8 !p-0">
                                                <Filter size={14} />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(plan)} className="h-8 w-8 !p-0 text-error hover:bg-error/10">
                                                <X size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full py-20 text-center"
                        >
                            <div className="bg-muted/30 inline-flex p-6 rounded-full mb-4">
                                <Search size={40} className="text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No plans found</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                We couldn't find any plans matching your search criteria. Try a different term or create a new plan.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Plan Modal */}
            <PlanModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                plan={selectedPlan}
            />
        </div>
    );
};
