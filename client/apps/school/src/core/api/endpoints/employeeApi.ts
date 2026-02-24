import { baseApi } from '../baseApi';

// Employee types
export interface Employee {
    id: string;
    user_id: string;
    institution_id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    department?: string;
    designation?: string;
    role_type: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// API Response type
interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export const employeeApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get all employees (teachers and staff)
        getEmployees: builder.query<ApiResponse<Employee[]>, { role_type?: string } | void>({
            query: (params) => ({
                url: '/school/employees',
                method: 'GET',
                params: params || {},
            }),
            providesTags: ['Employee'],
        }),

        // Get employees by role type
        getEmployeesByType: builder.query<ApiResponse<Employee[]>, string>({
            query: (roleType) => ({
                url: `/school/employees`,
                method: 'GET',
                params: { role_type: roleType },
            }),
            providesTags: ['Employee'],
        }),

        // Get single employee
        getEmployeeById: builder.query<ApiResponse<Employee>, string>({
            query: (id) => `/school/employees/${id}`,
            providesTags: (result, error, id) => [{ type: 'Employee', id }],
        }),

        // Create employee
        createEmployee: builder.mutation<ApiResponse<Employee>, Partial<Employee>>({
            query: (data) => ({
                url: data.role_type === 'teacher' ? '/school/teachers' : '/school/users/staff',
                method: 'POST',
                body: {
                    firstName: data.first_name,
                    lastName: data.last_name,
                    email: data.email,
                    phone: data.phone,
                    employeeId: data.employee_code,
                    designation: data.designation,
                    metadata: {
                        roleType: data.role_type,
                        department: data.department,
                    },
                },
            }),
            invalidatesTags: ['Employee'],
        }),

        // Update employee
        updateEmployee: builder.mutation<ApiResponse<Employee>, { id: string; data: Partial<Employee> }>({
            query: ({ id, data }) => ({
                url: `/school/employees/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Employee', id }, 'Employee'],
        }),

        // Delete employee
        deleteEmployee: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                url: `/school/employees/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Employee'],
        }),
    }),
});

export const {
    useGetEmployeesQuery,
    useGetEmployeesByTypeQuery,
    useGetEmployeeByIdQuery,
    useCreateEmployeeMutation,
    useUpdateEmployeeMutation,
    useDeleteEmployeeMutation,
} = employeeApi;
