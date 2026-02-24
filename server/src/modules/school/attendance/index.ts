// ============================================================================
// ATTENDANCE MODULE - BARREL EXPORTS
// Single entry point for the attendance module
// ============================================================================

// Types
export * from './types/attendance.types';

// Constants
export * from './constants/attendance.constants';

// Errors
export * from './errors/attendance.error';

// DTOs
export * from './dto/attendance.dto';

// Services
export * from './services';

// Controllers
export * from './controllers/attendance.controller';

// Routes - RBAC Pilot: Now exports direct router instead of factory
export { default as attendanceRoutes } from './routes/attendance.routes';

// Repository (for advanced use cases)
export { 
    createAttendanceRepositories,
    StudentAttendanceRepository,
    AttendanceSettingsRepository,
    LeaveRepository,
    AttendanceAuditRepository
} from './repositories/attendance.repository';

