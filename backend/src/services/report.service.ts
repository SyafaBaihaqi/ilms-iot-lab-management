import prisma from '../utils/prisma';
import { formatDateID, LETTER_CONFIG } from '../config/letter';

export type ReportType = 'inventory' | 'borrowing' | 'damage' | 'iot';

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  numeric?: boolean;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  status?: string;
}

const iso = (value: Date | null | undefined) => (value ? value.toISOString().split('T')[0] : '-');

/** Kolom per laporan, dipakai tabel web, header CSV, dan sheet Excel. */
export const REPORT_COLUMNS: Record<ReportType, ReportColumn[]> = {
  inventory: [
    { key: 'inventoryCode', label: 'Kode Inventaris' },
    { key: 'name', label: 'Nama Komponen' },
    { key: 'category', label: 'Kategori' },
    { key: 'stockTotal', label: 'Stok Total', align: 'right', numeric: true },
    { key: 'stockAvailable', label: 'Stok Tersedia', align: 'right', numeric: true },
    { key: 'stockBorrowed', label: 'Sedang Dipinjam', align: 'right', numeric: true },
    { key: 'condition', label: 'Kondisi' },
    { key: 'location', label: 'Lokasi' },
    { key: 'estimatedPrice', label: 'Estimasi Harga', align: 'right', numeric: true },
    { key: 'status', label: 'Status' }
  ],
  borrowing: [
    { key: 'code', label: 'Kode Transaksi' },
    { key: 'borrower', label: 'Peminjam' },
    { key: 'nim', label: 'NIM' },
    { key: 'loanDate', label: 'Tanggal Pinjam' },
    { key: 'dueDate', label: 'Jatuh Tempo' },
    { key: 'returnDate', label: 'Tanggal Kembali' },
    { key: 'itemCount', label: 'Jumlah Item', align: 'right', numeric: true },
    { key: 'totalQuantity', label: 'Total Unit', align: 'right', numeric: true },
    { key: 'items', label: 'Rincian Komponen' },
    { key: 'status', label: 'Status' },
    { key: 'approvedBy', label: 'Disetujui Oleh' }
  ],
  damage: [
    { key: 'code', label: 'Kode Transaksi' },
    { key: 'componentName', label: 'Komponen' },
    { key: 'inventoryCode', label: 'Kode Inventaris' },
    { key: 'quantity', label: 'Jumlah', align: 'right', numeric: true },
    { key: 'borrower', label: 'Peminjam' },
    { key: 'date', label: 'Tanggal Kembali' },
    { key: 'damageNotes', label: 'Keterangan Kerusakan' }
  ],
  iot: [
    { key: 'esp32Id', label: 'ESP32 ID' },
    { key: 'name', label: 'Nama Perangkat' },
    { key: 'type', label: 'Tipe' },
    { key: 'location', label: 'Lokasi' },
    { key: 'status', label: 'Status' },
    { key: 'firmwareVersion', label: 'Firmware' },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'lastSeen', label: 'Terakhir Seen', align: 'center' },
    { key: 'totalReadings', label: 'Jumlah Data Sensor', align: 'right', numeric: true }
  ]
};

export const REPORT_TITLES: Record<ReportType, string> = {
  inventory: 'Laporan Inventaris Komponen',
  borrowing: 'Laporan Peminjaman Komponen',
  damage: 'Laporan Kerusakan Komponen',
  iot: 'Laporan Perangkat IoT'
};

/** Ringkasan singkat di atas tabel, dihitung dari baris laporan. */
const buildSummary = (type: ReportType, rows: any[]): { label: string; value: string | number }[] => {
  const sum = (pick: (row: any) => number) => rows.reduce((acc, row) => acc + (Number(pick(row)) || 0), 0);

  if (type === 'inventory') {
    const totalStock = sum((r) => r.stockTotal);
    const available = sum((r) => r.stockAvailable);
    return [
      { label: 'Jenis Komponen', value: rows.length },
      { label: 'Total Unit', value: totalStock },
      { label: 'Unit Tersedia', value: available },
      { label: 'Unit Dipinjam', value: totalStock - available },
      { label: 'Nilai Estimasi', value: `Rp ${new Intl.NumberFormat('id-ID').format(sum((r) => r.estimatedPrice))}` }
    ];
  }

  if (type === 'borrowing') {
    const by = (status: string) => rows.filter((r) => r.status === status).length;
    return [
      { label: 'Total Transaksi', value: rows.length },
      { label: 'Menunggu', value: by('Pending') },
      { label: 'Dipinjam', value: by('Borrowed') },
      { label: 'Selesai', value: by('Returned') },
      { label: 'Ditolak/Batal', value: by('Rejected') + by('Cancelled') }
    ];
  }

  if (type === 'damage') {
    return [
      { label: 'Kasus Kerusakan', value: rows.length },
      { label: 'Unit Rusak', value: sum((r) => r.quantity) },
      {
        label: 'Peminjam Terdampak',
        value: new Set(rows.map((r) => r.borrower)).size
      }
    ];
  }

  const byStatus = (status: string) => rows.filter((r) => r.status === status).length;
  return [
    { label: 'Total Perangkat', value: rows.length },
    { label: 'Online', value: byStatus('Online') },
    { label: 'Offline', value: byStatus('Offline') },
    { label: 'Total Data Sensor', value: sum((r) => r.totalReadings) }
  ];
};

export class ReportService {
  static getColumns(type: ReportType): ReportColumn[] {
    return REPORT_COLUMNS[type] ?? [];
  }

  static async getInventoryReport(filters: ReportFilters = {}) {
    const components = await prisma.component.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { name: 'asc' }
    });

    return components
      .filter((c) => !filters.status || c.status === filters.status)
      .map((c) => ({
        inventoryCode: c.inventoryCode,
        name: c.name,
        category: c.category.name,
        stockTotal: c.stockTotal,
        stockAvailable: c.stockAvailable,
        stockBorrowed: c.stockTotal - c.stockAvailable,
        condition: c.condition,
        location: c.location || '-',
        estimatedPrice: c.estimatedPrice ? Number(c.estimatedPrice) : 0,
        status: c.status
      }));
  }

  static async getBorrowingReport(filters: ReportFilters = {}) {
    const where: any = {};
    if (filters.from || filters.to) {
      where.loanDate = {};
      if (filters.from) where.loanDate.gte = new Date(filters.from);
      if (filters.to) where.loanDate.lte = new Date(filters.to);
    }
    if (filters.status) where.status = filters.status;

    const loans = await prisma.loan.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true, nim: true } },
        approver: { select: { fullName: true } },
        details: { include: { component: { select: { name: true, inventoryCode: true } } } }
      },
      orderBy: { loanDate: 'desc' }
    });

    return loans.map((l) => ({
      id: l.id,
      code: l.id.slice(0, 8).toUpperCase(),
      borrower: l.user.fullName,
      nim: l.user.nim || '-',
      email: l.user.email,
      loanDate: iso(l.loanDate),
      dueDate: iso(l.dueDate),
      returnDate: iso(l.returnDate),
      itemCount: l.details.length,
      totalQuantity: l.details.reduce((acc, d) => acc + d.quantity, 0),
      items: l.details.map((d) => `${d.component.name} (${d.quantity}x)`).join(', '),
      status: l.status,
      approvedBy: l.approver?.fullName || '-'
    }));
  }

  static async getDamageReport(filters: ReportFilters = {}) {
    const where: any = { conditionAfter: 'Damaged' };
    if (filters.from || filters.to) {
      where.loan = { returnDate: {} };
      if (filters.from) where.loan.returnDate.gte = new Date(filters.from);
      if (filters.to) where.loan.returnDate.lte = new Date(filters.to);
    }

    const damagedDetails = await prisma.loanDetail.findMany({
      where,
      include: {
        loan: { include: { user: { select: { fullName: true } } } },
        component: { include: { category: true } }
      },
      orderBy: { loan: { updatedAt: 'desc' } }
    });

    return damagedDetails.map((d) => ({
      code: d.loanId.slice(0, 8).toUpperCase(),
      componentName: d.component.name,
      inventoryCode: d.component.inventoryCode,
      quantity: d.quantity,
      borrower: d.loan.user.fullName,
      date: iso(d.loan.returnDate),
      damageNotes: d.damageNotes || '-'
    }));
  }

  static async getIoTReport(filters: ReportFilters = {}) {
    const devices = await prisma.device.findMany({
      where: filters.status ? { status: filters.status as any } : undefined,
      include: { _count: { select: { readings: true } } },
      orderBy: { registeredAt: 'desc' }
    });

    return devices.map((d) => ({
      esp32Id: d.esp32Id,
      name: d.deviceName,
      type: d.deviceType,
      location: d.location || '-',
      status: d.status,
      firmwareVersion: d.firmwareVersion || '-',
      ipAddress: d.ipAddress || '-',
      lastSeen: d.lastSeen ? formatDateID(d.lastSeen) : '-',
      totalReadings: d._count.readings
    }));
  }

  static async getRows(type: ReportType, filters: ReportFilters = {}): Promise<any[]> {
    if (type === 'inventory') return this.getInventoryReport(filters);
    if (type === 'borrowing') return this.getBorrowingReport(filters);
    if (type === 'damage') return this.getDamageReport(filters);
    return this.getIoTReport(filters);
  }

  /** Bentuk respons JSON yang dipakai frontend: judul, ringkasan, kolom, baris. */
  static async buildReport(type: ReportType, filters: ReportFilters = {}) {
    const rows = await this.getRows(type, filters);
    return {
      meta: {
        type,
        title: REPORT_TITLES[type],
        generatedAt: new Date().toISOString(),
        filters: {
          from: filters.from ? formatDateID(filters.from) : null,
          to: filters.to ? formatDateID(filters.to) : null,
          status: filters.status || null
        },
        totalRows: rows.length
      },
      summary: buildSummary(type, rows),
      columns: this.getColumns(type),
      rows
    };
  }

  /**
   * Data surat peminjaman. Nomor surat memakai urutan peminjaman pada
   * tahun yang sama, jadi stably: SP/LAB/2026/0007.
   */
  static async getLoanLetter(loanId: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: { select: { fullName: true, nim: true, phone: true } },
        approver: { select: { fullName: true } },
        details: {
          include: {
            component: { select: { name: true, inventoryCode: true } }
          }
        }
      }
    });

    if (!loan) return null;

    const year = loan.loanDate.getFullYear();
    const sameYear = await prisma.loan.count({
      where: {
        loanDate: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59)
        }
      }
    });

    const items = loan.details.map((d) => ({
      inventoryCode: d.component.inventoryCode,
      name: d.component.name,
      quantity: d.quantity,
      conditionBefore: d.conditionBefore
    }));

    return {
      letterNumber: `${LETTER_CONFIG.letterPrefix}/${year}/${String(sameYear).padStart(4, '0')}`,
      letterDate: new Date(),
      loanCode: loan.id.slice(0, 8).toUpperCase(),
      loanId: loan.id,
      status: loan.status,
      borrower: {
        fullName: loan.user.fullName,
        nim: loan.user.nim,
        phone: loan.user.phone
      },
      approver: loan.approver,
      loanDate: loan.loanDate,
      dueDate: loan.dueDate,
      returnDate: loan.returnDate,
      items,
      totalQuantity: items.reduce((acc, i) => acc + i.quantity, 0)
    };
  }
}