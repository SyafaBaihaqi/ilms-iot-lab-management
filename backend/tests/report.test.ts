import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import ExcelJS from 'exceljs';
import app from '../src/app';
import {
  resetDatabase,
  seedFixtures,
  disconnect,
  ADMIN_CREDENTIALS,
  DOSEN_CREDENTIALS,
  MAHASISWA_CREDENTIALS
} from './helpers';

let adminToken = '';
let dosenToken = '';
let mahasiswaToken = '';
let componentId = '';
let approvedLoanId = '';

const login = async (username: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  expect(res.status).toBe(200);
  return res.body.data.accessToken as string;
};

/** Ambil body biner (PDF/XLSX) lewat supertest. */
const binaryGet = async (url: string, token: string) => {
  const res = await request(app)
    .get(url)
    .set('Authorization', `Bearer ${token}`)
    .buffer(true)
    .parse((raw, callback) => {
      const chunks: Buffer[] = [];
      raw.on('data', (c: Buffer) => chunks.push(c));
      raw.on('end', () => callback(null, Buffer.concat(chunks)));
    });
  return res;
};

describe('Fitur laporan dan surat peminjaman', () => {
  beforeAll(async () => {
    await resetDatabase();
    const fixtures = await seedFixtures();
    componentId = fixtures.component.id;

    adminToken = await login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    dosenToken = await login(DOSEN_CREDENTIALS.username, DOSEN_CREDENTIALS.password);
    mahasiswaToken = await login(MAHASISWA_CREDENTIALS.username, MAHASISWA_CREDENTIALS.password);

    const loan = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${mahasiswaToken}`)
      .send({
        items: [{ componentId, quantity: 1 }],
        dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
      });
    expect(loan.status).toBe(201);
    approvedLoanId = loan.body.data.id;

    const approve = await request(app)
      .put(`/api/loans/${approvedLoanId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(approve.status).toBe(200);
  });

  afterAll(async () => {
    await disconnect();
  });

  describe('Laporan JSON', () => {
    it('laporan inventaris punya judul, kolom, ringkasan, dan baris', async () => {
      const res = await request(app).get('/api/reports/inventory').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const { meta, columns, rows, summary } = res.body.data;
      expect(meta.title).toBe('Laporan Inventaris Komponen');
      expect(meta.totalRows).toBe(rows.length);
      expect(columns.map((c: any) => c.label)).toContain('Kode Inventaris');
      expect(summary.map((s: any) => s.label)).toContain('Total Unit');
      expect(rows[0]).toHaveProperty('stockBorrowed');
    });

    it('laporan peminjaman difilter berdasarkan tanggal dan status', async () => {
      const semua = await request(app).get('/api/reports/borrowing').set('Authorization', `Bearer ${adminToken}`);
      expect(semua.body.data.rows.length).toBeGreaterThan(0);

      const approved = await request(app)
        .get('/api/reports/borrowing?status=Borrowed')
        .set('Authorization', `Bearer ${adminToken}`);
      const approvedCount = approved.body.data.rows.length;
      expect(approvedCount).toBeGreaterThan(0);

      const pending = await request(app)
        .get('/api/reports/borrowing?status=Pending')
        .set('Authorization', `Bearer ${adminToken}`);
      const pendingCount = pending.body.data.rows.length;
      expect(pendingCount).toBeGreaterThanOrEqual(0);

      // pastikan filter tanggal kosong saat from jauh
      const upcoming = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const kosong = await request(app)
        .get(`/api/reports/borrowing?from=${upcoming}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(kosong.body.data.rows).toHaveLength(0);
    });

    it('laporan kerusakan dan IoT punya kolom yang sesuai', async () => {
      const damage = await request(app).get('/api/reports/damage').set('Authorization', `Bearer ${adminToken}`);
      expect(damage.status).toBe(200);
      expect(damage.body.data.columns.map((c: any) => c.key)).toContain('damageNotes');

      const iot = await request(app).get('/api/reports/iot').set('Authorization', `Bearer ${adminToken}`);
      expect(iot.status).toBe(200);
      expect(iot.body.data.columns.map((c: any) => c.key)).toContain('totalReadings');
    });

    it('mahasiswa tidak boleh membuka laporan (403)', async () => {
      for (const type of ['inventory', 'borrowing', 'damage', 'iot']) {
        const res = await request(app).get(`/api/reports/${type}`).set('Authorization', `Bearer ${mahasiswaToken}`);
        expect(res.status).toBe(403);
      }
    });
  });

  describe('Ekspor CSV', () => {
    it('CSV memakai header Indonesia dan BOM UTF-8', async () => {
      const res = await request(app)
        .get('/api/reports/inventory?format=csv')
        .set('Authorization', `Bearer ${dosenToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('laporan-inventaris');

      const text = res.text as unknown as string;
      expect(text.charCodeAt(0)).toBe(0xfeff);
      const header = text.replace(/^\uFEFF/, '').split('\r\n')[0];
      expect(header).toContain('Kode Inventaris');
      expect(header).toContain('Stok Tersedia');
    });
  });

  describe('Ekspor Excel', () => {
    it('xlsx bisa dibuka dan berisi judul serta header kolom', async () => {
      const res = await binaryGet('/api/reports/borrowing?format=xlsx', adminToken);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.body as Buffer);
      const ws = wb.worksheets[0];
      expect(ws.getCell('A1').value).toBe('Laporan Peminjaman Komponen');

      const texts: string[] = [];
      ws.eachRow((row) => row.eachCell((cell) => texts.push(String(cell.value ?? ''))));
      expect(texts.join('|')).toContain('Kode Transaksi');
      expect(texts.join('|')).toContain('RINGKASAN');
    });
  });

  describe('Ekspor PDF', () => {
    it('PDF laporan valid dan_attachment', async () => {
      const res = await binaryGet('/api/reports/inventory?format=pdf', adminToken);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('laporan-inventaris');

      const buffer = res.body as Buffer;
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      expect(Buffer.byteLength(buffer)).toBeGreaterThan(500);
    });

    it('format tidak didukung ditolak 400', async () => {
      const res = await request(app)
        .get('/api/reports/inventory?format=docx')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Surat peminjaman', () => {
    it('Dosen boleh membuat surat peminjaman', async () => {
      const res = await request(app)
        .get(`/api/loans/${approvedLoanId}/letter`)
        .set('Authorization', `Bearer ${dosenToken}`);

      expect(res.status).toBe(200);
      const letter = res.body.data;
      expect(letter.letterNumber).toMatch(/^SP\/LAB\/\d{4}\/\d{4}$/);
      expect(letter.loanCode).toHaveLength(8);
      expect(letter.borrower.nim).toBe('2022103');
      expect(letter.items).toHaveLength(1);
      expect(letter.totalQuantity).toBe(1);
      expect(letter.approver.fullName).toContain('Admin');
    });

    it('surat bisa diunduh sebagai PDF', async () => {
      const res = await binaryGet(`/api/loans/${approvedLoanId}/letter?format=pdf`, adminToken);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('surat-peminjaman');

      const buffer = res.body as Buffer;
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      expect(Buffer.byteLength(buffer)).toBeGreaterThan(500);
    });

    it('mahasiswa ditolak membuat surat (403)', async () => {
      const res = await request(app)
        .get(`/api/loans/${approvedLoanId}/letter`)
        .set('Authorization', `Bearer ${mahasiswaToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('peminjaman tidak知名 menghasilkan 404', async () => {
      const res = await request(app)
        .get('/api/loans/00000000-0000-4000-8000-000000000000/letter')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});