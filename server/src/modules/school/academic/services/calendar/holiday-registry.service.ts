export interface SmartHoliday {
    key: string;
    name: string;
    type: 'NATIONAL' | 'REGIONAL' | 'FIXED' | 'FLOATING';
    description?: string;
}

export class HolidayRegistryService {
    /**
     * Get the date for a smart holiday in a specific year
     * For now, we use a static map for floating holidays (2024-2026)
     * In a real system, this could call an external API or use complex calculation logic
     */
    static getHolidayDate(key: string, year: number): { month: number; day: number } | null {
        const floatingHolidays: Record<string, Record<number, { month: number; day: number }>> = {
            'IN_DIWALI': {
                2024: { month: 11, day: 1 },
                2025: { month: 10, day: 20 },
                2026: { month: 11, day: 8 },
                2027: { month: 10, day: 29 },
                2028: { month: 10, day: 17 },
                2029: { month: 11, day: 5 },
                2030: { month: 10, day: 26 }
            },
            'IN_HOLI': {
                2024: { month: 3, day: 25 },
                2025: { month: 3, day: 14 },
                2026: { month: 3, day: 3 },
                2027: { month: 3, day: 22 },
                2028: { month: 3, day: 11 },
                2029: { month: 3, day: 1 },
                2030: { month: 3, day: 20 }
            },
            'IN_EID_UL_FITR': {
                2024: { month: 4, day: 11 },
                2025: { month: 3, day: 31 },
                2026: { month: 3, day: 20 },
                2027: { month: 3, day: 10 },
                2028: { month: 2, day: 27 },
                2029: { month: 2, day: 15 },
                2030: { month: 2, day: 5 }
            },
            'IN_GOOD_FRIDAY': {
                2024: { month: 3, day: 29 },
                2025: { month: 4, day: 18 },
                2026: { month: 4, day: 3 },
                2027: { month: 3, day: 26 },
                2028: { month: 4, day: 14 },
                2029: { month: 3, day: 30 },
                2030: { month: 4, day: 19 }
            }
        };

        return floatingHolidays[key]?.[year] || null;
    }

    static getSystemHolidays(): SmartHoliday[] {
        return [
            { key: 'IN_REPUBLIC_DAY', name: 'Republic Day', type: 'NATIONAL', description: 'Celebration of Indian Constitution' },
            { key: 'IN_INDEPENDENCE_DAY', name: 'Independence Day', type: 'NATIONAL', description: 'Celebration of Freedom' },
            { key: 'IN_GANDHI_JAYANTI', name: 'Gandhi Jayanti', type: 'NATIONAL', description: 'Birthday of Mahatma Gandhi' },
            { key: 'IN_DIWALI', name: 'Diwali', type: 'FLOATING', description: 'Festival of Lights' },
            { key: 'IN_HOLI', name: 'Holi', type: 'FLOATING', description: 'Festival of Colors' },
            { key: 'IN_CHRISTMAS', name: 'Christmas', type: 'FIXED', description: 'Birth of Jesus Christ' }
        ];
    }
}
