import PDFDocument from 'pdfkit';

export interface PdfTableOptions {
    title: string;
    headers: string[];
    rows: string[][];
}

export function buildPdfBuffer(options: PdfTableOptions): Promise<Buffer> {
    const { title, headers, rows } = options;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(16).text(title, { underline: true });
        doc.moveDown();

        doc.fontSize(10).text(headers.join(' | '));
        doc.moveDown(0.5);

        rows.forEach((row) => {
            doc.text(row.join(' | '));
        });

        doc.end();
    });
}
