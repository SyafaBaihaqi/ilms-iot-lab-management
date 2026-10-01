import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';
import { resetDatabase, seedFixtures, disconnect } from './helpers';

let adminToken = '';
let categoryId = '';
let componentId = '';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Komponen & Audit Log', () => {
  beforeAll(async () => {
    await resetDatabase();
    const fixtures = await seedFixtures();
    categoryId = fixtures.category.id;
    componentId = fixtures.component.id;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await disconnect();
  });

  it('admin membuat komponen baru (201)', async () => {
    const res = await request(app)
      .post('/api/components')
      .set(auth(adminToken))
      .send({
        categoryId,
        name: 'Resistor 220 Ohm',
        inventoryCode: 'RES-220-001',
        stockTotal: 25,
        location: 'Rak A1'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.inventoryCode).toBe('RES-220-001');
    expect(res.body.data.stockAvailable).toBe(25);
  });

  it('pembuatan komponen tercatat di audit log dengan aktor yang benar', async () => {
    const res = await request(app)
      .get('/api/audit-logs?search=component.create')
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThan(0);

    const entry = res.body.data[0];
    expect(entry.entityType).toBe('Component');
    expect(entry.user.username).toBe('admin');
    expect(entry.metadata.inventoryCode).toBe('RES-220-001');
  });

  it('penyesuaian stok mengurangi stok tersedia', async () => {
    const res = await request(app)
      .post(`/api/components/${componentId}/adjust-stock`)
      .set(auth(adminToken))
      .send({ quantity: 3, transactionType: 'OUT', notes: 'Dipinjam uji coba' });

    expect(res.status).toBe(200);

    const component = await prisma.component.findUnique({ where: { id: componentId } });
    expect(component!.stockTotal).toBe(7);
    expect(component!.stockAvailable).toBe(7);
  });

  it('riwayat stok tercatat di component_stock_history', async () => {
    const history = await prisma.componentStockHistory.findMany({
      where: { componentId }
    });
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].transactionType).toBe('OUT');
  });

  it('QR Code komponen tersedia sebagai PNG', async () => {
    const res = await request(app)
      .get(`/api/components/${componentId}/qrcode`)
      .set(auth(adminToken))
      .buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    // tanda tangan file PNG = 89 50 4E 47
    expect(res.body.slice(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it('QR Code 404 untuk komponen yang tidak ada', async () => {
    const res = await request(app)
      .get('/api/components/tidak-ada/qrcode')
      .set(auth(adminToken));

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('COMPONENT_NOT_FOUND');
  });

  it('validasi Zod menolak data komponen tidak lengkap (400)', async () => {
    const res = await request(app)
      .post('/api/components')
      .set(auth(adminToken))
      .send({ categoryId, name: 'Tanpa Kode' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('audit log bisa difilter berdasarkan entitas', async () => {
    const res = await request(app)
      .get('/api/audit-logs?entityType=Component')
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((item: any) => item.entityType === 'Component')).toBe(true);
  });

  it('audit log mencatat IP address pemohon', async () => {
    const res = await request(app)
      .get('/api/audit-logs?entityType=Component')
      .set(auth(adminToken));

    const withIp = res.body.data.find((item: any) => item.ipAddress);
    expect(withIp).toBeTruthy();
  });
});
