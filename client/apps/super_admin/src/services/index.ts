/**
 * Services Index
 * Barrel export for all service modules
 * 
 * IMPORTANT: Order matters here to avoid circular dependencies
 * 1. Export api first (creates the base API instance)
 * 2. Import endpoints (which inject into the api)
 * 3. Export hooks from endpoints
 */

// Core API (must be first)
export { api } from './api';

// Types
export * from './types';

// Config
export { API_CONFIG, getApiUrl } from './config';

// Endpoint hooks (these inject into api when imported)
// Import them here to ensure they're registered
import './endpoints/auth';
import './endpoints/institutions';
import './endpoints/dashboard';
import './endpoints/admins';
import './endpoints/global-holidays';

// Re-export all hooks
export * from './endpoints/auth';
export * from './endpoints/institutions';
export * from './endpoints/dashboard';
export * from './endpoints/admins';
export * from './endpoints/global-holidays';

