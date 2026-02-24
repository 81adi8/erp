import { Router } from 'express';
import { authGuard } from '../../../core/middleware/authGuard';
import * as authController from '../controllers/auth.controller';
import { validate, validateParams } from '../../../core/middleware/validate.middleware';
import {
    RegisterSchema,
    LoginSchema,
    RefreshTokenSchema,
    ChangePasswordSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    MfaVerifySchema,
    SessionIdParamSchema,
    LogoutAllSchema,
    CompleteMfaLoginSchema,
} from '../../auth/auth.schemas';

const router = Router();

// ============================================================================
// Public Routes (No auth required)
// ============================================================================

// Registration — PRODUCTION HARDENED: Added validation
router.post('/register', validate(RegisterSchema), authController.register);

// Login — PRODUCTION HARDENED: Added validation
router.post('/login', validate(LoginSchema), authController.login);

// Refresh token — PRODUCTION HARDENED: Added validation
router.post('/refresh', validate(RefreshTokenSchema), authController.refresh);

// Forgot password — PRODUCTION HARDENED: Added validation
router.post('/forgot-password', 
    validate(ForgotPasswordSchema),
    authController.forgotPassword ?? ((_req, res) =>
        res.status(501).json({ success: false, message: 'Forgot password not yet implemented' })
    )
);

// Reset password — PRODUCTION HARDENED: Added validation
router.post('/reset-password',
    validate(ResetPasswordSchema),
    authController.resetPassword ?? ((_req, res) =>
        res.status(501).json({ success: false, message: 'Reset password not yet implemented' })
    )
);

// ============================================================================
// MFA Routes (Public — called with temp token before full session)
// ============================================================================

// MFA verify — PRODUCTION HARDENED: Added validation
router.post('/mfa/verify',
    validate(MfaVerifySchema),
    authController.verifyMfa ?? ((_req, res) =>
        res.status(501).json({ success: false, message: 'MFA verify not yet implemented' })
    )
);

// Complete MFA login — PRODUCTION HARDENED: Added validation
// STABILIZATION: Fixed wiring - was incorrectly calling verifyMfa instead of completeMfaLogin
router.post('/mfa/complete',
    validate(CompleteMfaLoginSchema),
    authController.completeMfaLogin ?? ((_req, res) =>
        res.status(503).json({ success: false, message: 'MFA complete not yet available' })
    )
);

// ============================================================================
// Protected Routes (Auth required)
// ============================================================================

router.use(authGuard);

// Get current user profile
router.get('/me', authController.me);

// Logout current session
router.post('/logout', authController.logout);

// Logout from all devices — PRODUCTION HARDENED: Added validation
router.post('/logout-all', validate(LogoutAllSchema), authController.logoutAll);

// Get all active sessions
router.get('/sessions', authController.sessions);

// Revoke a specific session — PRODUCTION HARDENED: Added param validation
router.delete('/sessions/:sessionId', 
    validateParams(SessionIdParamSchema),
    authController.revokeSession
);

// Change password — PRODUCTION HARDENED: Added validation
router.post('/change-password', 
    validate(ChangePasswordSchema), 
    authController.changePassword
);

// MFA setup requires auth (user must be logged in to set up MFA)
router.post('/mfa/setup', authController.setupMfa ?? ((_req, res) =>
    res.status(501).json({ success: false, message: 'MFA setup not yet implemented' })
));

export default router;
