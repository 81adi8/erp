// Feature Flag System Configuration

// Common feature flags available across all tenant types
export const FEATURE_FLAGS = {
    // UI/UX Features
    ENABLE_DARK_MODE: 'enable_dark_mode',
    ENABLE_ANIMATIONS: 'enable_animations',
    ENABLE_COMPACT_VIEW: 'enable_compact_view',

    // Communication Features
    ENABLE_NOTIFICATIONS: 'enable_notifications',
    ENABLE_EMAIL_NOTIFICATIONS: 'enable_email_notifications',
    ENABLE_SMS_NOTIFICATIONS: 'enable_sms_notifications',
    ENABLE_PUSH_NOTIFICATIONS: 'enable_push_notifications',

    // Reporting Features
    ENABLE_REPORTS: 'enable_reports',
    ENABLE_EXPORT_PDF: 'enable_export_pdf',
    ENABLE_EXPORT_EXCEL: 'enable_export_excel',
    ENABLE_ANALYTICS: 'enable_analytics',

    // Integration Features
    ENABLE_MOBILE_APP: 'enable_mobile_app',
    ENABLE_WHATSAPP_INTEGRATION: 'enable_whatsapp_integration',
    ENABLE_PAYMENT_GATEWAY: 'enable_payment_gateway',

    // Advanced Features
    ENABLE_AI_FEATURES: 'enable_ai_features',
    ENABLE_BIOMETRIC_ATTENDANCE: 'enable_biometric_attendance',
    ENABLE_ONLINE_EXAMS: 'enable_online_exams',
    ENABLE_VIDEO_CONFERENCING: 'enable_video_conferencing',
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export type FeatureFlagValue = typeof FEATURE_FLAGS[FeatureFlagKey];

// Feature flag categories for UI organization
export const FEATURE_FLAG_CATEGORIES = {
    UI_UX: ['enable_dark_mode', 'enable_animations', 'enable_compact_view'],
    COMMUNICATION: ['enable_notifications', 'enable_email_notifications', 'enable_sms_notifications', 'enable_push_notifications'],
    REPORTING: ['enable_reports', 'enable_export_pdf', 'enable_export_excel', 'enable_analytics'],
    INTEGRATIONS: ['enable_mobile_app', 'enable_whatsapp_integration', 'enable_payment_gateway'],
    ADVANCED: ['enable_ai_features', 'enable_biometric_attendance', 'enable_online_exams', 'enable_video_conferencing'],
} as const;

// Default feature flag values
export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
    [FEATURE_FLAGS.ENABLE_DARK_MODE]: true,
    [FEATURE_FLAGS.ENABLE_ANIMATIONS]: true,
    [FEATURE_FLAGS.ENABLE_COMPACT_VIEW]: false,
    [FEATURE_FLAGS.ENABLE_NOTIFICATIONS]: true,
    [FEATURE_FLAGS.ENABLE_EMAIL_NOTIFICATIONS]: false,
    [FEATURE_FLAGS.ENABLE_SMS_NOTIFICATIONS]: false,
    [FEATURE_FLAGS.ENABLE_PUSH_NOTIFICATIONS]: false,
    [FEATURE_FLAGS.ENABLE_REPORTS]: true,
    [FEATURE_FLAGS.ENABLE_EXPORT_PDF]: true,
    [FEATURE_FLAGS.ENABLE_EXPORT_EXCEL]: true,
    [FEATURE_FLAGS.ENABLE_ANALYTICS]: false,
    [FEATURE_FLAGS.ENABLE_MOBILE_APP]: false,
    [FEATURE_FLAGS.ENABLE_WHATSAPP_INTEGRATION]: false,
    [FEATURE_FLAGS.ENABLE_PAYMENT_GATEWAY]: false,
    [FEATURE_FLAGS.ENABLE_AI_FEATURES]: false,
    [FEATURE_FLAGS.ENABLE_BIOMETRIC_ATTENDANCE]: false,
    [FEATURE_FLAGS.ENABLE_ONLINE_EXAMS]: false,
    [FEATURE_FLAGS.ENABLE_VIDEO_CONFERENCING]: false,
};
