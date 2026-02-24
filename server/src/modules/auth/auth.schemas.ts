/**
 * Auth DTO Schemas — Production Hardened
 * 
 * Zod schemas for runtime validation of all auth endpoints.
 * All schemas include security constraints and sanitization.
 */

import { z } from 'zod';

// ============================================================================
// Password Validation
// ============================================================================

/**
 * Password strength requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number, and special character');

// Optional password (for updates) - still validate strength if provided
const optionalPasswordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number, and special character')
    .optional();

// ============================================================================
// Common Fields
// ============================================================================

const emailSchema = z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .transform(email => email.toLowerCase().trim());

const nameSchema = z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .transform(name => name.trim());

const phoneSchema = z.string()
    .max(20, 'Phone must not exceed 20 characters')
    .optional();

const sessionIdSchema = z.string()
    .uuid('Invalid session ID');

// ============================================================================
// Registration Schema
// ============================================================================

export const RegisterSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema,
    institutionId: z.string().uuid().optional(),
}).strict();

export type RegisterDTO = z.infer<typeof RegisterSchema>;

// ============================================================================
// Login Schema
// ============================================================================

export const LoginSchema = z.object({
    email: emailSchema,
    password: z.string()
        .min(1, 'Password is required')
        .max(128, 'Password must not exceed 128 characters'),
    rememberMe: z.boolean().optional().default(false),
}).strict();

export type LoginDTO = z.infer<typeof LoginSchema>;

// ============================================================================
// Refresh Token Schema
// ============================================================================

export const RefreshTokenSchema = z.object({
    refreshToken: z.string()
        .min(1, 'Refresh token is required')
        .max(256, 'Invalid refresh token format')
        .optional(),
}).strict();

export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;

// ============================================================================
// Change Password Schema
// ============================================================================

export const ChangePasswordSchema = z.object({
    currentPassword: z.string()
        .min(1, 'Current password is required')
        .max(128, 'Password must not exceed 128 characters'),
    newPassword: passwordSchema,
}).strict().refine(
    (data) => data.currentPassword !== data.newPassword,
    { message: 'New password must be different from current password' }
);

export type ChangePasswordDTO = z.infer<typeof ChangePasswordSchema>;

// ============================================================================
// Forgot Password Schema
// ============================================================================

export const ForgotPasswordSchema = z.object({
    email: emailSchema,
}).strict();

export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordSchema>;

// ============================================================================
// Reset Password Schema
// ============================================================================

export const ResetPasswordSchema = z.object({
    token: z.string()
        .min(1, 'Reset token is required')
        .max(256, 'Invalid reset token format'),
    newPassword: passwordSchema,
}).strict();

export type ResetPasswordDTO = z.infer<typeof ResetPasswordSchema>;

// ============================================================================
// MFA Schemas
// ============================================================================

export const MfaVerifySchema = z.object({
    mfaToken: z.string()
        .min(1, 'MFA token is required')
        .max(512, 'Invalid MFA token format'),
    totpCode: z.string()
        .min(6, 'MFA code must be 6 digits')
        .max(6, 'MFA code must be 6 digits')
        .regex(/^\d{6}$/, 'MFA code must be 6 digits'),
}).strict();

export type MfaVerifyDTO = z.infer<typeof MfaVerifySchema>;

export const MfaSetupSchema = z.object({
    // No body required - uses authenticated user
}).strict();

export type MfaSetupDTO = z.infer<typeof MfaSetupSchema>;

export const MfaConfirmSchema = z.object({
    code: z.string()
        .min(6, 'MFA code must be 6 digits')
        .max(6, 'MFA code must be 6 digits')
        .regex(/^\d{6}$/, 'MFA code must be 6 digits'),
    secret: z.string().max(128).optional(), // TOTP secret from setup
}).strict();

export type MfaConfirmDTO = z.infer<typeof MfaConfirmSchema>;

// ============================================================================
// Session Schemas
// ============================================================================

export const SessionIdParamSchema = z.object({
    sessionId: sessionIdSchema,
}).strict();

export type SessionIdParamDTO = z.infer<typeof SessionIdParamSchema>;

export const LogoutAllSchema = z.object({
    keepCurrent: z.boolean().optional().default(false),
}).strict();

export type LogoutAllDTO = z.infer<typeof LogoutAllSchema>;

// ============================================================================
// Complete MFA Login Schema
// ============================================================================

export const CompleteMfaLoginSchema = z.object({
    mfaToken: z.string()
        .min(1, 'MFA token is required')
        .max(512, 'Invalid MFA token format'),
    totpCode: z.string()
        .min(6, 'MFA code must be 6 digits')
        .max(6, 'MFA code must be 6 digits')
        .regex(/^\d{6}$/, 'MFA code must be 6 digits'),
}).strict();

export type CompleteMfaLoginDTO = z.infer<typeof CompleteMfaLoginSchema>;

// ============================================================================
// Tenant MFA Schemas (for mfa.routes.ts)
// ============================================================================

export const MfaSetupBodySchema = z.object({}).strict();

export const MfaConfirmBodySchema = z.object({
    totpCode: z.string()
        .min(6, 'TOTP code must be 6 digits')
        .max(6, 'TOTP code must be 6 digits')
        .regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
}).strict();

export const MfaVerifyBodySchema = z.object({
    mfaToken: z.string()
        .min(1, 'MFA token is required')
        .max(512, 'Invalid MFA token format'),
    totpCode: z.string()
        .min(6, 'TOTP code must be 6 digits')
        .max(6, 'TOTP code must be 6 digits')
        .regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
}).strict();

export const MfaDisableBodySchema = z.object({
    userId: z.string().uuid('Invalid user ID format').optional(),
}).strict();

// ============================================================================
// Export all schemas
// ============================================================================

export const AuthSchemas = {
    register: RegisterSchema,
    login: LoginSchema,
    refreshToken: RefreshTokenSchema,
    changePassword: ChangePasswordSchema,
    forgotPassword: ForgotPasswordSchema,
    resetPassword: ResetPasswordSchema,
    mfaVerify: MfaVerifySchema,
    mfaSetup: MfaSetupSchema,
    mfaConfirm: MfaConfirmSchema,
    sessionIdParam: SessionIdParamSchema,
    logoutAll: LogoutAllSchema,
    completeMfaLogin: CompleteMfaLoginSchema,
    mfaSetupBody: MfaSetupBodySchema,
    mfaConfirmBody: MfaConfirmBodySchema,
    mfaVerifyBody: MfaVerifyBodySchema,
    mfaDisableBody: MfaDisableBodySchema,
};

export default AuthSchemas;
