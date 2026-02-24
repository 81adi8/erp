import ExcelJS from 'exceljs';

export interface ExcelColumn {
    header: string;
    key: string;
    width?: number;
}

export async function buildExcelBuffer(
    sheetName: string,
    columns: ExcelColumn[],
    rows: Array<Record<string, unknown>>,
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;
    worksheet.addRows(rows);

    worksheet.getRow(1).font = { bold: true };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
}
