/**
 * Tenant types supported by the system
 */
export enum InstitutionType {
    SCHOOL = 'school',
    UNIVERSITY = 'university',
    COACHING = 'coaching'
}

/**
 * Model directory mapping by institution type
 * Defines which directories to load models from during tenant initialization
 */
export const MODEL_DIRECTORIES: Record<InstitutionType, string[]> = {
    [InstitutionType.SCHOOL]: ['academics', 'attendance', 'timetable', 'examination', 'parents', 'config', 'fees', 'communication', 'reports'],
    [InstitutionType.UNIVERSITY]: ['structure', 'enrollment'],
    [InstitutionType.COACHING]: [], // Add coaching modules when ready
};
