import ExcelJS from 'exceljs';
import { ReportColumn, ReportFilters, ReportType, REPORT_TITLES } from './report.service';
import { formatDateID } from '../config/letter';

const csvCell = (value: unknown) => {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
};

/**
 * CSV dengan BOM UTF-8 supaya karakter Indonesia (mis. "µ", "–")
 * tidak berantakan saat dibuka di Excel Windows.
 */
export const buildCsv = (columns: ReportColumn[], rows: any[]): string => {
  const lines = [columns.map((c) => csvCell(c.label)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(row[c.key])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
};

/** Excel (.xlsx) dengan baris judul, waktu dibuat, dan ringkasan. */
export const buildExcelBuffer = async (
  type: ReportType,
  columns: ReportColumn[],
  rows: any[],
  summary: { label: string; value: string | number }[],
  filters: ReportFilters
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ILMS - IoT Lab Management';
  wb.created = new Date();
  const ws = wb.addWorksheet('Laporan');

  ws.mergeCells(1, 1, 1, columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = REPORT_TITLES[type];
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  ws.mergeCells(2, 1, 2, columns.length);
  const metaCell = ws.getCell(2, 1);
  const filterText = [filters.from && formatDateID(filters.from), filters.to && formatDateID(filters.to)]
    .filter(Boolean)
    .join(' s.d. ');
  metaCell.value = `Dibuat ${formatDateID(new Date())}${filterText ? ` · Periode ${filterText}` : ''}${
    filters.status ? ` · Status ${filters.status}` : ''
  }`;
  metaCell.font = { size: 10, color: { argb: 'FF64748B' } };
  metaCell.alignment = { horizontal: 'center' };

  let rowIndex = 4;
  if (summary.length > 0) {
    ws.getCell(rowIndex, 1).value = 'RINGKASAN';
    ws.getCell(rowIndex, 1).font = { bold: true, size: 11 };
    rowIndex += 1;
    summary.forEach((item) => {
      ws.getCell(rowIndex, 1).value = item.label;
      ws.getCell(rowIndex, 2).value = item.value;
      ws.getCell(rowIndex, 2).font = { bold: true };
      rowIndex += 1;
    });
    rowIndex += 1;
  }

  const headerRow = ws.getRow(rowIndex);
  headerRow.values = columns.map((c) => c.label);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  headerRow.alignment = { horizontal: 'center' };
  headerRow.commit();

  for (const row of rows) {
    const values = columns.map((c) => row[c.key]);
    ws.addRow(values);
  }

  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.numeric ? 14 : Math.max(14, Math.min(38, col.label.length + 8));
  });
  ws.views = [{ state: 'frozen', ySplit: rowIndex }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
};