import PDFDocument from 'pdfkit';
import { ReportColumn, ReportFilters, ReportType, REPORT_TITLES } from './report.service';
import { LETTER_CONFIG, formatDateID, formatNumberID } from '../config/letter';

const PAGE_MARGIN = 40;

const collect = (doc: PDFKit.PDFDocument): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

const kop = (doc: PDFKit.PDFDocument, title: string, subtitle?: string) => {
  doc.font('Helvetica-Bold').fontSize(14).text(LETTER_CONFIG.institutionName, { align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor('#475569').text(LETTER_CONFIG.institutionAddress, { align: 'center' });
  doc.moveDown(0.3);
  doc
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor('#0f172a')
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.6);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(title, { align: 'center' });
  if (subtitle) {
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(subtitle, { align: 'center' });
  }
  doc.moveDown(0.6);
};

const tableWidth = (doc: PDFKit.PDFDocument) => doc.page.width - PAGE_MARGIN * 2;

/** Gambar tabel sederhana dengan header yang diulang tiap halaman. */
const drawTable = (
  doc: PDFKit.PDFDocument,
  columns: ReportColumn[],
  rows: any[],
  options: { fontSize?: number; maxRowsPerPage?: number } = {}
) => {
  const fontSize = options.fontSize ?? 7.5;
  const usable = tableWidth(doc);
  const weights = columns.map((c) => Math.max(6, Math.min(24, c.label.length + (c.key.length / 4))));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / totalWeight) * usable);
  const rowHeight = fontSize * 2.4;

  const drawHead = () => {
    const y = doc.y;
    doc.rect(PAGE_MARGIN, y, usable, rowHeight).fill('#e2e8f0');
    let x = PAGE_MARGIN;
    columns.forEach((col, i) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(fontSize)
        .fillColor('#0f172a')
        .text(col.label, x + 3, y + rowHeight / 2 - fontSize * 0.62, {
          width: widths[i] - 6,
          align: col.numeric ? 'right' : col.align === 'center' ? 'center' : 'left',
          lineBreak: false,
          ellipsis: true
        });
      x += widths[i];
    });
    doc.y = y + rowHeight;
    doc.x = PAGE_MARGIN;
  };

  drawHead();

  rows.forEach((row, rowIndex) => {
    if (doc.y + rowHeight > doc.page.height - PAGE_MARGIN - 24) {
      doc.addPage();
      drawHead();
    }
    if (rowIndex % 2 === 1) {
      doc.rect(PAGE_MARGIN, doc.y, usable, rowHeight).fill('#f8fafc');
    }
    let x = PAGE_MARGIN;
    columns.forEach((col, i) => {
      const raw = row[col.key];
      const text =
        raw === null || raw === undefined || raw === '' ? '-' : col.numeric ? formatNumberID(raw) : String(raw);
      doc
        .font('Helvetica')
        .fontSize(fontSize)
        .fillColor('#334155')
        .text(text, x + 3, doc.y + rowHeight / 2 - fontSize * 0.62, {
          width: widths[i] - 6,
          align: col.numeric ? 'right' : col.align === 'center' ? 'center' : 'left',
          lineBreak: false,
          ellipsis: true
        });
      x += widths[i];
    });
    doc.x = PAGE_MARGIN;
    doc.y += rowHeight;
  });
};

const footer = (doc: PDFKit.PDFDocument, generatedBy?: string) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const y = doc.page.height - 32;
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
    doc.text(`ILMS · Laboratory Component Management System`, PAGE_MARGIN, y, {
      width: tableWidth(doc) / 2,
      lineBreak: false
    });
    doc.text(`Hal. ${i - range.start + 1} dari ${range.count}`, PAGE_MARGIN + tableWidth(doc) / 2, y, {
      width: tableWidth(doc) / 2,
      align: 'right',
      lineBreak: false
    });
    if (generatedBy) {
      doc.text(`Dicetak oleh ${generatedBy}`, PAGE_MARGIN, y - 9, { width: tableWidth(doc), lineBreak: false });
    }
  }
};

/** PDF tabel laporan, multi halaman. */
export const buildReportPdf = async (options: {
  type: ReportType;
  columns: ReportColumn[];
  rows: any[];
  summary: { label: string; value: string | number }[];
  filters: ReportFilters;
  generatedBy?: string;
}): Promise<Buffer> => {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
  const done = collect(doc);

  const period = [options.filters.from && formatDateID(options.filters.from), options.filters.to && formatDateID(options.filters.to)]
    .filter(Boolean)
    .join(' s.d. ');
  const subtitle = [
    period && `Periode ${period}`,
    options.filters.status && `Status ${options.filters.status}`
  ]
    .filter(Boolean)
    .join(' · ');

  kop(doc, REPORT_TITLES[options.type], subtitle || undefined);

  doc.font('Helvetica').fontSize(8).fillColor('#334155');
  doc.text(`Dibuat pada ${formatDateID(new Date())} · Total data: ${options.rows.length} baris`, PAGE_MARGIN, doc.y);
  if (options.summary.length > 0) {
    doc.moveDown(0.2);
    doc.fontSize(8).text(options.summary.map((s) => `${s.label}: ${s.value}`).join('  |  '), PAGE_MARGIN, doc.y);
  }
  doc.moveDown(0.5);

  if (options.rows.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748b').text('Tidak ada data untuk laporan ini.', PAGE_MARGIN, doc.y);
  } else {
    drawTable(doc, options.columns, options.rows);
  }

  footer(doc, options.generatedBy);
  doc.end();
  return done;
};

export interface LetterItem {
  inventoryCode: string;
  name: string;
  quantity: number;
  conditionBefore?: string | null;
}

export interface LetterPayload {
  letterNumber: string;
  letterDate: Date;
  loanCode: string;
  loanId: string;
  status: string;
  borrower: { fullName: string; nim?: string | null; phone?: string | null };
  approver?: { fullName: string } | null;
  loanDate: Date;
  dueDate: Date;
  returnDate?: Date | null;
  items: LetterItem[];
  totalQuantity: number;
}

/** PDF surat peminjaman komponen: kop, nomor surat, rincian, blok tanda tangan. */
export const buildLoanLetterPdf = async (letter: LetterPayload): Promise<Buffer> => {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
  const done = collect(doc);

  doc.font('Helvetica-Bold').fontSize(14).text(LETTER_CONFIG.institutionName.toUpperCase(), { align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor('#475569').text(LETTER_CONFIG.institutionAddress, { align: 'center' });
  doc.moveDown(0.3);
  doc
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .lineWidth(1)
    .strokeColor('#0f172a')
    .stroke();
  doc.moveDown(1);

  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13).text('SURAT PEMINJAMAN KOMPONEN', { align: 'center' });
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`Nomor: ${letter.letterNumber}`, PAGE_MARGIN, doc.y, {
    align: 'right'
  });
  doc.text(`Lampiran: ${letter.items.length} jenis komponen`, { align: 'right' });
  doc.moveDown(0.8);

  doc.fontSize(10).fillColor('#0f172a').text(
    [
      'Yang bertanda tangan di bawah ini menyatakan dengan ini bahwa:',
      '',
      `Nama          : ${letter.borrower.fullName}`,
      `NIM           : ${letter.borrower.nim || '-'}`,
      `Kode transaksi: ${letter.loanCode}`,
      `Tanggal pinjam: ${formatDateID(letter.loanDate)}`,
      `Jatuh tempo   : ${formatDateID(letter.dueDate)}`,
      letter.returnDate ? `Tanggal kembali: ${formatDateID(letter.returnDate)}` : '',
      '',
      'Telah meminjam komponen berikut dengan kondisi dan tanggung jawab sebagai berikut:'
    ]
      .filter((line) => line !== '')
      .join('\n'),
    PAGE_MARGIN,
    doc.y
  );
  doc.moveDown(0.5);

  const letterColumns: ReportColumn[] = [
    { key: 'no', label: 'No' },
    { key: 'inventoryCode', label: 'Kode Inventaris' },
    { key: 'name', label: 'Nama Komponen' },
    { key: 'quantity', label: 'Jumlah', align: 'right', numeric: true },
    { key: 'conditionBefore', label: 'Kondisi' }
  ];
  const letterRows = letter.items.map((item, i) => ({
    no: i + 1,
    inventoryCode: item.inventoryCode,
    name: item.name,
    quantity: item.quantity,
    conditionBefore: item.conditionBefore || 'Good'
  }));
  drawTable(doc, letterColumns, letterRows, { fontSize: 8 });

  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9).fillColor('#334155').text(
    `Total unit dipinjam: ${letter.totalQuantity} buah. Komponen wajib dikembalikan sesuai tanggal jatuh tempo dalam kondisi baik.`,
    PAGE_MARGIN,
    doc.y
  );
  doc.moveDown(1.2);

  const blockTop = doc.y;
  const half = tableWidth(doc) / 2;
  doc.fontSize(9).fillColor('#0f172a');
  doc.text('Dosen Pengampu', PAGE_MARGIN, blockTop, { width: half, align: 'center' });
  doc.text(LETTER_CONFIG.signatureTitle, PAGE_MARGIN + half, blockTop, { width: half, align: 'center' });
  doc.moveDown(3);
  doc.font('Helvetica-Bold').text(letter.approver?.fullName || LETTER_CONFIG.signatureTitle, PAGE_MARGIN, doc.y, {
    width: half,
    align: 'center'
  });
  doc.text(LETTER_CONFIG.headName, PAGE_MARGIN + half, doc.y, { width: half, align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text('NIP: -', PAGE_MARGIN, doc.y, { width: half, align: 'center' });
  doc.text('NIP: -', PAGE_MARGIN + half, doc.y, { width: half, align: 'center' });
  doc.y = blockTop;

  footer(doc);
  doc.end();
  return done;
};

export { LETTER_CONFIG };