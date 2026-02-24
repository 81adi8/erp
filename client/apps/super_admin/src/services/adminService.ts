// import { api } from '../lib/api';

// export interface AdminUser {
//     id: string;
//     email: string;
//     name: string;
//     role: string;
//     is_active: boolean;
//     created_at: string;
// }

// export const adminService = {
//     // Current admin profile
//     getProfile: async () => {
//         const response = await api.get<{ data: AdminUser }>('/auth/me'); // Assuming auth flow shares this
//         return response.data;
//     },

//     // List all admins
//     listAdmins: async (page = 1, limit = 20) => {
//         const response = await api.get<{ data: AdminUser[]; total: number }>(`/super-admin/admins?page=${page}&limit=${limit}`);
//         return response.data;
//     },

//     // Create new admin
//     createAdmin: async (data: { email: string; name: string; password: string; role?: string }) => {
//         const response = await api.post<{ data: AdminUser }>('/super-admin/admins', data);
//         return response.data;
//     },

//     // Update admin
//     updateAdmin: async (id: string, data: Partial<AdminUser>) => {
//         const response = await api.patch<{ data: AdminUser }>(`/super-admin/admins/${id}`, data);
//         return response.data;
//     },

//     // Delete (deactivate) admin
//     deleteAdmin: async (id: string) => {
//         const response = await api.delete(`/super-admin/admins/${id}`);
//         return response.data;
//     }
// };
