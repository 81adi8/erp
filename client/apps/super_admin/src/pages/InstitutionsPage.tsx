import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Filter,
    LayoutGrid,
    LayoutList,
    Building2,
    MoreVertical,
    Edit,
    Trash2,
    ExternalLink,
    Mail,
    Calendar,
} from 'lucide-react';
import {
    Button,
    Input,
    Badge,
    Card,
    Table,
    Modal,
    ModalFooter,
    type Column
} from '@erp/common';
import {
    useGetInstitutionsQuery,
    useDeleteInstitutionMutation,
    type Institution
} from '../services';

type ViewMode = 'table' | 'card';

// Mock data for when API is unavailable
const mockInstitutions: Institution[] = [
    {
        id: '1',
        name: 'Delhi Public School',
        subdomain: 'dps',
        schema_name: 'tenant_dps',
        status: 'active',
        plan_id: 'premium',
        plan: { id: 'premium', name: 'Premium' },
        contact_email: 'admin@dps.edu',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '2',
        name: 'ABC Academy',
        subdomain: 'abc-academy',
        schema_name: 'tenant_abc_academy',
        status: 'active',
        plan_id: 'basic',
        plan: { id: 'basic', name: 'Basic' },
        contact_email: 'info@abc-academy.com',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '3',
        name: 'XYZ College',
        subdomain: 'xyz-college',
        schema_name: 'tenant_xyz_college',
        status: 'pending',
        plan_id: null,
        contact_email: 'contact@xyz-college.edu',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '4',
        name: 'Global International School',
        subdomain: 'gis',
        schema_name: 'tenant_gis',
        status: 'suspended',
        plan_id: 'enterprise',
        plan: { id: 'enterprise', name: 'Enterprise' },
        contact_email: 'admin@gis.edu',
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
];

const statusVariants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    active: 'success',
    pending: 'warning',
    suspended: 'error',
    inactive: 'default',
};

const InstitutionCard: React.FC<{
    institution: Institution;
    onEdit: (inst: Institution) => void;
    onDelete: (inst: Institution) => void;
}> = ({ institution, onEdit, onDelete }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
    >
        <Card hover className="h-full">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-text">{institution.name}</h3>
                        <p className="text-sm text-text-muted">{institution.subdomain}.schoolerp.com</p>
                    </div>
                </div>
                <Badge variant={statusVariants[institution.status] || 'default'}>
                    {institution.status}
                </Badge>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Mail className="w-4 h-4" />
                    {institution.contact_email}
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Calendar className="w-4 h-4" />
                    Created {new Date(institution.created_at).toLocaleDateString()}
                </div>
            </div>

            {institution.plan && (
                <div className="mb-4">
                    <Badge variant="outline">{institution.plan.name} Plan</Badge>
                </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-border-light">
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    leftIcon={<ExternalLink className="w-4 h-4" />}
                >
                    Visit
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(institution)}
                >
                    <Edit className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(institution)}
                >
                    <Trash2 className="w-4 h-4 text-error" />
                </Button>
            </div>
        </Card>
    </motion.div>
);

export const InstitutionsPage: React.FC = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteModal, setDeleteModal] = useState<Institution | null>(null);

    // Fetch data
    const { data, isLoading, error } = useGetInstitutionsQuery({ page: 1, limit: 50 });
    const [deleteInstitution, { isLoading: isDeleting }] = useDeleteInstitutionMutation();

    // Use real data or mock
    const institutions = data?.data || mockInstitutions;

    // Filter by search
    const filteredInstitutions = institutions.filter(inst =>
        inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (institution: Institution) => {
        navigate(`/institutions/${institution.id}/edit`);
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        try {
            await deleteInstitution(deleteModal.id).unwrap();
            setDeleteModal(null);
        } catch (err) {
            console.error('Failed to delete institution:', err);
        }
    };

    // Table columns
    const columns: Column<Institution>[] = [
        {
            key: 'name',
            header: 'Institution',
            sortable: true,
            render: (inst) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-text">{inst.name}</p>
                        <a href={inst?.domainUrl} target="_blank" className="text-xs text-text-muted">{inst?.domainUrl ?? inst?.subdomain}</a>
                    </div>
                </div>
            ),
        },
        {
            key: 'contact_email',
            header: 'Contact',
            sortable: true,
        },
        {
            key: 'plan',
            header: 'Plan',
            render: (inst) => inst.plan ? (
                <Badge variant="outline">{inst.plan.name}</Badge>
            ) : (
                <span className="text-text-muted">—</span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (inst) => (
                <Badge variant={statusVariants[inst.status] || 'default'}>
                    {inst.status}
                </Badge>
            ),
        },
        {
            key: 'created_at',
            header: 'Created',
            sortable: true,
            render: (inst) => new Date(inst.created_at ?? inst?.createdAt).toLocaleDateString(),
        },
        {
            key: 'actions',
            header: '',
            width: '100px',
            render: (inst) => (
                <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(inst)}>
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteModal(inst)}>
                        <Trash2 className="w-4 h-4 text-error" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Institutions</h1>
                    <p className="text-muted-foreground mt-1">Manage all tenant institutions on the platform</p>
                </div>
                <Link to="/institutions/new">
                    <Button leftIcon={<Plus className="w-4 h-4" />}>
                        New Institution
                    </Button>
                </Link>
            </div>

            {/* Filters & Search */}
            <Card variant="default" padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search institutions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='flex-1 h-10'
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button className="flex-1 flex" variant="outline" size="md" leftIcon={<Filter className="w-4 h-4" />}>
                            Filters
                        </Button>
                        <div className="flex items-center border border-border rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:bg-surface-hover'}`}
                            >
                                <LayoutList className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('card')}
                                className={`p-2 ${viewMode === 'card' ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:bg-surface-hover'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content */}
            <AnimatePresence mode="wait">
                {viewMode === 'table' ? (
                    <motion.div
                        key="table"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Table
                            data={filteredInstitutions}
                            columns={columns}
                            keyExtractor={(inst) => inst.id}
                            loading={isLoading}
                            emptyMessage="No institutions found"
                            onRowClick={(inst) => navigate(`/institutions/${inst.id}`)}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="cards"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {filteredInstitutions.map((inst) => (
                            <InstitutionCard
                                key={inst.id}
                                institution={inst}
                                onEdit={handleEdit}
                                onDelete={setDeleteModal}
                            />
                        ))}
                        {filteredInstitutions.length === 0 && !isLoading && (
                            <div className="col-span-full text-center py-12 text-text-muted">
                                No institutions found
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                title="Delete Institution"
                description="This action cannot be undone."
                size="sm"
            >
                <p className="text-text-secondary">
                    Are you sure you want to delete <strong>{deleteModal?.name}</strong>?
                    This will remove all associated data.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDeleteModal(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        isLoading={isDeleting}
                    >
                        Delete Institution
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};
