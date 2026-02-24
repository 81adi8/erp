// School Module API Services - Academic Calendar
import { baseApi } from '../../../core/api/baseApi';
import { API_TAGS } from '../../../core/config/constants';

export type DayStatus = 'WORKING' | 'HOLIDAY' | 'WEEKLY_OFF' | 'NON_SESSION' | 'EXAM' | 'EVENT';

export const DayStatusValues: Record<string, DayStatus> = {
    WORKING: 'WORKING',
    HOLIDAY: 'HOLIDAY',
    WEEKLY_OFF: 'WEEKLY_OFF',
    NON_SESSION: 'NON_SESSION',
    EXAM: 'EXAM',
    EVENT: 'EVENT'
};

export interface DayDetail {
    date: string;
    status: DayStatus;
    id?: string;
    name?: string;
    description?: string;
    isGazetted?: boolean;
    holidayType?: string;
    isRecurring?: boolean;
}

export const academicCalendarApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /**
         * Get status for a specific date
         */
        getDayStatus: builder.query<DayDetail, { date: string; sessionId?: string }>({
            query: (params) => ({
                url: '/school/academics/calendar/day',
                params
            }),
            transformResponse: (response: { success: boolean; data: DayDetail }) => response.data,
            providesTags: (result) => result ? [{ type: API_TAGS.ACADEMIC_CALENDAR, id: result.date }] : [API_TAGS.ACADEMIC_CALENDAR],
        }),

        /**
         * Get calendar range status (e.g., for a month view)
         */
        getCalendarRange: builder.query<Record<string, DayDetail>, { startDate: string; endDate: string; sessionId?: string }>({
            query: (params) => ({
                url: '/school/academics/calendar/range',
                params
            }),
            transformResponse: (response: { success: boolean; data: Record<string, DayDetail> }) => response.data,
            providesTags: [API_TAGS.ACADEMIC_CALENDAR],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetDayStatusQuery,
    useGetCalendarRangeQuery,
    useLazyGetDayStatusQuery,
    useLazyGetCalendarRangeQuery,
} = academicCalendarApi;
