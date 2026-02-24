
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Edit, Trash2, Shield, Box } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

export interface PlanModule {
    id: string;
    name: string;
    slug: string;
}

export interface PlanPermission {
    id: string;
    key: string;
    action: string;
}

export interface Plan {
    id: string;
    name: string;
    slug: string;
    price_monthly: number | string;
    price_yearly: number | string;
    description: string;
    is_active: boolean;
    modules?: PlanModule[];
    permissions?: PlanPermission[];
}

interface PlanCardProps {
    plan: Plan;
    onEdit?: (plan: Plan) => void;
    onDelete?: (plan: Plan) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onEdit, onDelete }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="h-full flex flex-col overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300 shadow-lg hover:shadow-primary/5">
                <div className="p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground font-mono">{plan.slug}</p>
                        </div>
                        <Badge variant={plan.is_active ? 'success' : 'default'}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-semibold text-primary">${plan.price_monthly}</span>
                            <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            ${plan.price_yearly} / year (save ${((Number(plan.price_monthly) * 12) - Number(plan.price_yearly)).toFixed(2)})
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6 line-clamp-3">
                        {plan.description || 'No description provided.'}
                    </p>

                    <div className="space-y-4 flex-grow">
                        {plan.modules && plan.modules.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <Box size={14} />
                                    <span>Included Modules</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {plan.modules.map(mod => (
                                        <Badge key={mod.id} variant="outline" className="bg-primary/5 border-primary/10">
                                            {mod.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {plan.permissions && plan.permissions.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <Shield size={14} />
                                    <span>Core Permissions</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {plan.permissions.slice(0, 5).map(perm => (
                                        <Badge key={perm.id} variant="outline" className="text-[10px] py-0">
                                            {perm.key.split('.').pop()}
                                        </Badge>
                                    ))}
                                    {plan.permissions.length > 5 && (
                                        <span className="text-[10px] text-muted-foreground pl-1">
                                            +{plan.permissions.length - 5} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-8 pt-6 border-t border-border">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => onEdit?.(plan)}
                        >
                            <Edit size={16} />
                            Edit
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={() => onDelete?.(plan)}
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};
