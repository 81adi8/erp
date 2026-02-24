// School Module Configuration
export const schoolModuleConfig = {
    type: 'school' as const,
    name: 'School Management',
    description: 'Complete K-12 school ERP solution',
    version: '1.0.0',
    features: {
        dashboard: { enabled: true, permission: 'dashboard.view' },
        students: { enabled: true, permission: 'students.view' },
        teachers: { enabled: true, permission: 'teachers.view' },
        attendance: { enabled: true, permission: 'attendance.view' },
        exams: { enabled: true, permission: 'exams.view' },
        fees: { enabled: true, permission: 'fees.view' },
        timetable: { enabled: true, permission: 'timetable.view' },
        classes: { enabled: true, permission: 'classes.view' },
        homework: { enabled: true, permission: 'homework.view' },
        library: { enabled: false, permission: 'library.view' },
        transport: { enabled: false, permission: 'transport.view' },
    },
};

export default schoolModuleConfig;
