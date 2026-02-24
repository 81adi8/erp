import { api } from '../api';

export interface GlobalHoliday {
    id: string;
    name: string;
    country_code: string;
    region?: string;
    year: number;
    date: string;
    month: number;
    day: number;
    description?: string;
    type: string;
    holiday_key: string;
}

interface GlobalHolidaysApiResponse {
    data: GlobalHoliday[];
}

export const globalHolidayApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getGlobalHolidays: builder.query<GlobalHoliday[], { year: number; country?: string }>({
            query: ({ year, country }) => ({
                url: `/root/admin/global-holidays?year=${year}&country=${country || 'IN'}`,
                method: 'GET',
            }),
            transformResponse: (response: GlobalHolidaysApiResponse) => response.data,
            providesTags: ['GlobalHoliday'],
        }),
        syncGlobalHolidays: builder.mutation<void, { year: number; country?: string }>({
            query: (data) => ({
                url: `/root/admin/global-holidays/sync`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['GlobalHoliday'],
        }),
        upsertGlobalHoliday: builder.mutation<GlobalHoliday, Partial<GlobalHoliday>>({
            query: (data) => ({
                url: `/root/admin/global-holidays/upsert`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['GlobalHoliday'],
        }),
        deleteGlobalHoliday: builder.mutation<void, string>({
            query: (id) => ({
                url: `/root/admin/global-holidays/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['GlobalHoliday'],
        }),
    }),
});

export const {
    useGetGlobalHolidaysQuery,
    useSyncGlobalHolidaysMutation,
    useUpsertGlobalHolidayMutation,
    useDeleteGlobalHolidayMutation,
} = globalHolidayApi;
