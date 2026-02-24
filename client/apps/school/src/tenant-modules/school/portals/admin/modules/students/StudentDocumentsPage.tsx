import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    FileCheck2,
    FileText,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import {
    Button,
    Card,
    ConfirmDialog,
    Input,
    LoadingSpinner,
    Modal,
} from '@erp/common';
import { formatApiError } from '@/common/services/apiHelpers';
import {
    useDeleteStudentDocumentMutation,
    useGetStudentDocumentsQuery,
    useGetStudentsQuery,
    useGetTransferCertificateQuery,
    useIssueTransferCertificateMutation,
    useUploadStudentDocumentMutation,
    useVerifyStudentDocumentMutation,
    type StudentDocumentType,
} from '../../../../api/studentsApi';

const uploadDocumentSchema = z.object({
    documentType: z.enum([
        'birth_certificate',
        'transfer_certificate',
        'marksheet',
        'id_proof',
        'address_proof',
        'photo',
        'other',
    ]),
    fileName: z.string().trim().optional().or(z.literal('')),
    fileUrl: z.string().url('Valid file URL is required'),
    remarks: z.string().trim().optional().or(z.literal('')),
});

type UploadDocumentFormData = z.infer<typeof uploadDocumentSchema>;

export default function StudentDocumentsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { data: studentsResponse, isFetching: isSearchingStudents } = useGetStudentsQuery(
        { search: searchTerm || undefined, limit: 20 },
        { skip: searchTerm.trim().length < 2 && !selectedStudentId },
    );

    const { data: documentsResponse, isFetching: isFetchingDocuments, refetch: refetchDocuments } = useGetStudentDocumentsQuery(
        selectedStudentId || '',
        { skip: !selectedStudentId },
    );

    const { data: transferCertificateResponse, refetch: refetchTransferCertificate } = useGetTransferCertificateQuery(
        selectedStudentId || '',
        { skip: !selectedStudentId },
    );

    const [uploadStudentDocument, { isLoading: isUploading }] = useUploadStudentDocumentMutation();
    const [deleteStudentDocument, { isLoading: isDeleting }] = useDeleteStudentDocumentMutation();
    const [verifyStudentDocument, { isLoading: isVerifying }] = useVerifyStudentDocumentMutation();
    const [issueTransferCertificate, { isLoading: isIssuingTransferCertificate }] = useIssueTransferCertificateMutation();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<UploadDocumentFormData>({
        resolver: zodResolver(uploadDocumentSchema),
        defaultValues: {
            documentType: 'birth_certificate',
            fileName: '',
            fileUrl: '',
            remarks: '',
        },
    });

    const students = studentsResponse?.data || [];
    const documents = documentsResponse?.data || [];
    const transferCertificate = transferCertificateResponse?.data || null;
    const selectedStudent = useMemo(
        () => students.find((item) => item.id === selectedStudentId) || null,
        [selectedStudentId, students],
    );

    const openUploadModal = () => {
        setFormError('');
        setSuccessMessage('');
        reset({
            documentType: 'birth_certificate',
            fileName: '',
            fileUrl: '',
            remarks: '',
        });
        setIsUploadModalOpen(true);
    };

    const submitUpload = async (values: UploadDocumentFormData) => {
        if (!selectedStudentId) {
            setFormError('Select a student first.');
            return;
        }

        try {
            setFormError('');
            await uploadStudentDocument({
                studentId: selectedStudentId,
                documentType: values.documentType as StudentDocumentType,
                fileName: values.fileName || undefined,
                fileUrl: values.fileUrl,
                remarks: values.remarks || undefined,
            }).unwrap();

            setSuccessMessage('Document uploaded successfully.');
            setIsUploadModalOpen(false);
            await refetchDocuments();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    const submitDelete = async () => {
        if (!selectedStudentId || !deleteDocumentId) return;

        try {
            setFormError('');
            await deleteStudentDocument({ studentId: selectedStudentId, docId: deleteDocumentId }).unwrap();
            setSuccessMessage('Document deleted successfully.');
            setDeleteDocumentId(null);
            await refetchDocuments();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    const submitVerify = async (docId: string) => {
        if (!selectedStudentId) return;

        try {
            setFormError('');
            await verifyStudentDocument({ studentId: selectedStudentId, docId }).unwrap();
            setSuccessMessage('Document verified successfully.');
            await refetchDocuments();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    const submitIssueTransferCertificate = async () => {
        if (!selectedStudentId) {
            setFormError('Select a student first.');
            return;
        }

        try {
            setFormError('');
            await issueTransferCertificate(selectedStudentId).unwrap();
            setSuccessMessage('Transfer certificate issued successfully.');
            await refetchTransferCertificate();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    const openExternal = (url: string | undefined) => {
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Student Documents</h1>
                        <p className="text-sm text-text-muted">Upload, verify, and manage student records</p>
                    </div>
                </div>
            </div>

            {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {formError}
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {successMessage}
                </div>
            )}

            <Card className="p-4">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search student by name or admission number..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="pl-9"
                    />
                </div>

                {isSearchingStudents && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <LoadingSpinner size="sm" />
                        Searching...
                    </div>
                )}

                {searchTerm.trim().length >= 2 && students.length > 0 && (
                    <div className="mt-3 border border-border rounded-lg overflow-hidden">
                        {students.slice(0, 8).map((student) => (
                            <button
                                key={student.id}
                                type="button"
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`w-full px-4 py-3 text-left hover:bg-muted/40 ${selectedStudentId === student.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                            >
                                <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {student.rollNumber || 'No Roll'} | {student.className || 'No Class'}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </Card>

            {selectedStudentId && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold">
                                {selectedStudent?.firstName} {selectedStudent?.lastName}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {selectedStudent?.className || '-'} {selectedStudent?.sectionName ? `- ${selectedStudent.sectionName}` : ''}
                            </p>
                        </div>
                        <Button onClick={openUploadModal}>
                            <Plus size={14} className="mr-2" />
                            Upload Document
                        </Button>
                    </Card>

                    <Card className="p-0 overflow-hidden">
                        {isFetchingDocuments ? (
                            <div className="p-10 flex justify-center">
                                <LoadingSpinner size="lg" />
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="p-10 text-center text-muted-foreground">No documents uploaded for this student.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/40 border-b border-border">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Document Type</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">File</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Upload Date</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {documents.map((doc) => (
                                            <motion.tr key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                                <td className="px-4 py-3 text-sm capitalize">{doc.documentType.replaceAll('_', ' ')}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <button
                                                        type="button"
                                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                                        onClick={() => openExternal(doc.fileUrl)}
                                                    >
                                                        {doc.fileName || 'View File'}
                                                        <ExternalLink size={12} />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {doc.isVerified ? (
                                                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Verified</span>
                                                    ) : (
                                                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openExternal(doc.fileUrl)}
                                                        >
                                                            View
                                                        </Button>
                                                        {!doc.isVerified && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => void submitVerify(doc.id)}
                                                                disabled={isVerifying}
                                                            >
                                                                <FileCheck2 size={14} className="mr-1" />
                                                                Verify
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600"
                                                            onClick={() => setDeleteDocumentId(doc.id)}
                                                        >
                                                            <Trash2 size={14} className="mr-1" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    <Card className="p-5">
                        <h3 className="text-base font-semibold mb-3">Transfer Certificate</h3>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Format: <span className="font-medium text-foreground">TC-{selectedStudent?.rollNumber || 'ADM'}-{new Date().getFullYear()}-SEQ</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {transferCertificate?.tcNumber
                                        ? `Issued: ${transferCertificate.tcNumber}`
                                        : 'No transfer certificate issued yet.'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => void submitIssueTransferCertificate()}
                                    disabled={isIssuingTransferCertificate}
                                >
                                    {isIssuingTransferCertificate ? (
                                        <>
                                            <LoadingSpinner size="sm" className="mr-2" />
                                            Issuing...
                                        </>
                                    ) : (
                                        'Issue TC'
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => openExternal(transferCertificate?.fileUrl)}
                                    disabled={!transferCertificate?.fileUrl}
                                >
                                    View TC
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}

            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Upload Document"
                size="md"
            >
                <form onSubmit={handleSubmit((values) => void submitUpload(values))} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Document Type</label>
                        <select
                            {...register('documentType')}
                            className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.documentType ? 'border-error' : 'border-input'}`}
                        >
                            <option value="birth_certificate">Birth Certificate</option>
                            <option value="transfer_certificate">Transfer Certificate</option>
                            <option value="marksheet">Marksheet</option>
                            <option value="id_proof">ID Proof</option>
                            <option value="address_proof">Address Proof</option>
                            <option value="photo">Photo</option>
                            <option value="other">Other</option>
                        </select>
                        {errors.documentType && <p className="text-xs text-error">{errors.documentType.message}</p>}
                    </div>

                    <Input
                        label="File Name"
                        placeholder="Optional display name"
                        {...register('fileName')}
                        error={errors.fileName?.message}
                    />

                    <Input
                        label="File URL *"
                        placeholder="https://..."
                        {...register('fileUrl')}
                        error={errors.fileUrl?.message}
                    />

                    <Input
                        label="Remarks"
                        placeholder="Optional note"
                        {...register('remarks')}
                        error={errors.remarks?.message}
                    />

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isUploading || isSubmitting}>
                            {(isUploading || isSubmitting) ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-2" />
                                    Uploading...
                                </>
                            ) : 'Upload'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteDocumentId}
                onClose={() => setDeleteDocumentId(null)}
                onConfirm={() => void submitDelete()}
                title="Delete Document"
                message="Are you sure you want to delete this document?"
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                type="danger"
            />
        </div>
    );
}
