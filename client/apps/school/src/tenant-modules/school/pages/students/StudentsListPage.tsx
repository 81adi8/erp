// Students List Page - Using module-specific RTK Query API
import { useState } from 'react';
import { useGetStudentsQuery, useDeleteStudentMutation } from '../../api/studentsApi';
import { usePermission } from '../../../../core/rbac';

export default function StudentsListPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const { hasPermission } = usePermission();

    // Use module-specific RTK Query API
    const { data, isLoading, isFetching, error } = useGetStudentsQuery({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
    });

    const [deleteStudent] = useDeleteStudentMutation();

    const students = data?.data || [];
    const meta = data?.meta;

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this student?')) {
            try {
                await deleteStudent(id).unwrap();
            } catch (err) {
                console.error('Delete failed:', err);
            }
        }
    };

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                    Failed to load students. Please try again.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Students</h1>
                    <p className="text-muted-foreground">
                        {meta ? `${meta.total} total students` : 'Loading...'}
                    </p>
                </div>
                {hasPermission('students.create') && (
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                        Add Student
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="bg-card rounded-lg border p-4 mb-6">
                <input
                    type="text"
                    placeholder="Search students by name or roll number..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : (
                <>
                    {/* Students Table */}
                    <div className="bg-card rounded-lg border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Roll No</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Class</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {students.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                            No students found
                                        </td>
                                    </tr>
                                ) : (
                                    students.map((student) => (
                                        <tr key={student.id} className={`hover:bg-muted/50 ${isFetching ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3 text-sm">{student.rollNumber}</td>
                                            <td className="px-4 py-3 text-sm font-medium">
                                                {student.firstName} {student.lastName}
                                            </td>
                                            <td className="px-4 py-3 text-sm">{student.className || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">{student.email}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs ${student.status === 'active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex gap-2">
                                                    <button className="text-blue-600 hover:text-blue-800">View</button>
                                                    {hasPermission('students.update') && (
                                                        <button className="text-gray-600 hover:text-gray-800">Edit</button>
                                                    )}
                                                    {hasPermission('students.delete') && (
                                                        <button
                                                            onClick={() => handleDelete(student.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border rounded disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-1">
                                    Page {meta.page} of {meta.totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                                    disabled={currentPage === meta.totalPages}
                                    className="px-3 py-1 border rounded disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
