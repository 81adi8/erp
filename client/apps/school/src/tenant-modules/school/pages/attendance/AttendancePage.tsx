// ============================================================================
// Attendance Page - wired to backend. Functional, no redesign.
// ============================================================================
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    useGetSectionsQuery,
    useGetDailyAttendanceQuery,
    useBulkMarkStudentAttendanceMutation,
    type SectionOption,
} from '../../api/attendanceApi';
import {
    markAttendanceSchema,
    markAttendanceSubmissionSchema,
    type MarkAttendanceFormData,
} from '@/core/validation/schemas';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';

interface AttendanceRow {
    studentId: string;
    studentName: string;
    rollNumber?: string;
    status: AttendanceStatus;
}

export default function AttendancePage() {
    const today = new Date().toISOString().split('T')[0];
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    const {
        register,
        watch,
        trigger,
        formState: { errors },
    } = useForm<MarkAttendanceFormData>({
        resolver: zodResolver(markAttendanceSchema),
        defaultValues: {
            date: today,
            sectionId: '',
        },
    });

    const selectedDate = watch('date');
    const sectionId = watch('sectionId');

    const dateField = register('date');
    const sectionField = register('sectionId');

    const { data: sectionsData, isLoading: sectionsLoading } = useGetSectionsQuery();
    const sections = sectionsData?.data ?? [];

    const { data, isLoading, isError } = useGetDailyAttendanceQuery(
        { date: selectedDate, sectionId: sectionId || undefined },
        { skip: !sectionId }
    );

    const [bulkMark, { isLoading: isSaving }] = useBulkMarkStudentAttendanceMutation();

    const students: AttendanceRow[] = (data?.data ?? []).map((s: { studentId?: string; id?: string; studentName?: string; name?: string; rollNumber?: string; status?: AttendanceStatus }) => ({
        studentId: s.studentId ?? s.id ?? '',
        studentName: s.studentName ?? s.name ?? '',
        rollNumber: s.rollNumber,
        status: attendance[s.studentId ?? s.id ?? ''] ?? s.status ?? 'PRESENT',
    }));

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendance((prev) => ({ ...prev, [studentId]: status }));
        setSaved(false);
    };

    const handleMarkAll = (status: AttendanceStatus) => {
        const all: Record<string, AttendanceStatus> = {};
        students.forEach((s) => {
            all[s.studentId] = status;
        });
        setAttendance(all);
        setSaved(false);
    };

    const handleSave = async () => {
        setSaveError('');
        setSaved(false);

        const filtersValid = await trigger(['date', 'sectionId']);
        if (!filtersValid) {
            return;
        }

        const records = students.map((s) => ({
            studentId: s.studentId,
            date: selectedDate,
            status: attendance[s.studentId] ?? s.status,
            sectionId,
        }));

        const validation = markAttendanceSubmissionSchema.safeParse({
            date: selectedDate,
            sectionId,
            records: records.map((record) => ({
                studentId: record.studentId,
                status: record.status,
            })),
        });

        if (!validation.success) {
            setSaveError(validation.error.issues[0]?.message ?? 'Invalid attendance payload');
            return;
        }

        try {
            await bulkMark({ records, date: selectedDate, sectionId }).unwrap();
            setSaved(true);
        } catch {
            setSaveError('Failed to save attendance. Please try again.');
        }
    };

    const statusColors: Record<AttendanceStatus, string> = {
        PRESENT: 'bg-green-100 text-green-800 border-green-300',
        ABSENT: 'bg-red-100 text-red-800 border-red-300',
        LATE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        LEAVE: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
                <p className="text-muted-foreground text-sm mt-1">Mark daily attendance for your class</p>
            </div>

            <div className="flex flex-wrap gap-4 bg-card border border-border rounded-xl p-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">Date</label>
                    <input
                        type="date"
                        max={today}
                        {...dateField}
                        onChange={(e) => {
                            dateField.onChange(e);
                            setSaved(false);
                        }}
                        className={`border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${errors.date ? 'border-error' : 'border-border'}`}
                    />
                    {errors.date && <span className="text-sm text-error">{errors.date.message}</span>}
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium">Section</label>
                    <select
                        {...sectionField}
                        onChange={(e) => {
                            sectionField.onChange(e);
                            setSaved(false);
                            setAttendance({});
                        }}
                        disabled={sectionsLoading}
                        className={`border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px] ${errors.sectionId ? 'border-error' : 'border-border'}`}
                    >
                        <option value="">
                            {sectionsLoading ? 'Loading sections...' : sections.length === 0 ? 'No sections found' : 'Select a section'}
                        </option>
                        {sections.map((sec: SectionOption) => (
                            <option key={sec.id} value={sec.id}>
                                {sec.name}{sec.grade ? ` - Grade ${sec.grade}` : ''}
                            </option>
                        ))}
                    </select>
                    {errors.sectionId && <span className="text-sm text-error">{errors.sectionId.message}</span>}
                </div>
            </div>

            {!sectionId && (
                <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-xl">
                    {sectionsLoading ? 'Loading your sections...' : 'Select a section above to load students.'}
                </div>
            )}

            {sectionId && isLoading && (
                <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-xl animate-pulse">
                    Loading students...
                </div>
            )}

            {sectionId && isError && (
                <div className="text-center text-red-500 py-12 bg-card border border-border rounded-xl">
                    Failed to load attendance data. Check section ID and try again.
                </div>
            )}

            {sectionId && !isLoading && !isError && students.length > 0 && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b border-border">
                        <span className="text-sm text-muted-foreground">{students.length} students</span>
                        <div className="flex gap-2 ml-auto">
                            {(['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] as AttendanceStatus[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleMarkAll(s)}
                                    className={`text-xs px-3 py-1 rounded-full border font-medium ${statusColors[s]}`}
                                >
                                    All {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">#</th>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Student</th>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Roll No.</th>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, idx) => (
                                <tr key={student.studentId} className="border-t border-border hover:bg-muted/30">
                                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                    <td className="px-4 py-3 font-medium text-foreground">{student.studentName}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{student.rollNumber ?? '-'}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={attendance[student.studentId] ?? student.status}
                                            onChange={(e) => handleStatusChange(student.studentId, e.target.value as AttendanceStatus)}
                                            className={`text-xs px-2 py-1 rounded-full border font-medium focus:outline-none ${statusColors[attendance[student.studentId] ?? student.status]}`}
                                        >
                                            <option value="PRESENT">Present</option>
                                            <option value="ABSENT">Absent</option>
                                            <option value="LATE">Late</option>
                                            <option value="LEAVE">Leave</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex items-center gap-4 p-4 border-t border-border">
                        {saved && <span className="text-sm text-green-600 font-medium">Attendance saved</span>}
                        {saveError && <span className="text-sm text-red-500">{saveError}</span>}
                        <button
                            onClick={() => void handleSave()}
                            disabled={isSaving}
                            className="ml-auto bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                        >
                            {isSaving ? 'Saving...' : 'Save Attendance'}
                        </button>
                    </div>
                </div>
            )}

            {sectionId && !isLoading && !isError && students.length === 0 && (
                <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-xl">
                    No students found for this section on {selectedDate}.
                </div>
            )}
        </div>
    );
}
