import { z } from 'zod';

const PHONE_REGEX = /^[\d\s\-+()]{7,20}$/;

const optionalText = z.string().trim().optional().or(z.literal(''));

const optionalPhone = z
    .string()
    .trim()
    .regex(PHONE_REGEX, 'Invalid phone number')
    .optional()
    .or(z.literal(''));

export const admitStudentSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: optionalPhone,
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    gender: z.enum(['male', 'female', 'other']),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional().or(z.literal('')),
    aadharNumber: z
        .string()
        .regex(/^\d{12}$/, 'Aadhar must be 12 digits')
        .optional()
        .or(z.literal('')),
    admissionNumber: z.string().min(1, 'Admission number is required'),
    admissionDate: optionalText,
    parentName: z.string().min(1, 'Parent/Guardian name is required'),
    parentPhone: z
        .string()
        .trim()
        .min(1, 'Parent phone is required')
        .regex(PHONE_REGEX, 'Invalid parent phone number'),
    emergencyContactName: optionalText,
    emergencyContactPhone: optionalPhone,
    currentAddress: z.string().trim().min(1, 'Current address is required'),
    permanentAddress: optionalText,
    religion: optionalText,
    caste: optionalText,
    category: z.enum(['General', 'OBC', 'SC', 'ST', 'EWS', 'Other']).optional().or(z.literal('')),
    medicalHistory: optionalText,
    remarks: optionalText,
});

export type AdmitStudentFormData = z.infer<typeof admitStudentSchema>;
