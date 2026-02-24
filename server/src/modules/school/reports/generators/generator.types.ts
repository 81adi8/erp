import type { ReportJob } from '../../../../database/models/school/reports/ReportJob.model';

export interface ReportDataSet {
    title: string;
    headers: string[];
    rows: string[][];
}

export interface ReportGeneratorContext {
    schema: string;
    chunkSize: number;
    // RPT-01 FIX: Added maxRows for overall row limit
    maxRows?: number;
}

export type ReportGenerator = (
    job: ReportJob,
    context: ReportGeneratorContext,
) => Promise<ReportDataSet>;

export const safeText = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '-';
    }

    const asText = String(value).trim();
    return asText.length ? asText : '-';
};

export const toNumber = (value: unknown): number => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
};

export const parseDate = (value?: string): Date | undefined => {
    if (!value) {
        return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return undefined;
    }

    return parsed;
};

export const buildFullName = (firstName: unknown, lastName: unknown): string => {
    const first = typeof firstName === 'string' ? firstName.trim() : '';
    const last = typeof lastName === 'string' ? lastName.trim() : '';

    const fullName = `${first} ${last}`.trim();
    return fullName.length ? fullName : '-';
};
