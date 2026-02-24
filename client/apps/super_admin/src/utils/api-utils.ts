import { API_CONFIG } from '../services/config';

/**
 * Create a tagged api endpoint path
 */
export const createEndpoint = (path: string): string => {
    return `${API_CONFIG.prefix}${path}`;
};
