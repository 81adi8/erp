export { StudentAttendance } from './StudentAttendance.model';
export { TeacherAttendance } from './TeacherAttendance.model';
export { AttendanceSettings } from './AttendanceSettings.model';
export { LeaveApplication } from './LeaveApplication.model';
export { AttendanceAuditLog } from './AttendanceAuditLog.model';
export { AttendanceSummary } from './AttendanceSummary.model';

// Re-export types for backward compatibility if needed, 
// but preferred way is to import from attendance/types
export * from '../../../../modules/school/attendance/types';
