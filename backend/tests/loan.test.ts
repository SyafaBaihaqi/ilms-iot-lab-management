import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';
import { LoanStatus } from '@prisma/client';
import { resetDatabase, seedFixtures, disconnect } from './helpers';

let adminToken = '';
let userToken = '';
let componentId = '';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const login = async (username: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body.data.accessToken as string;
};

describe('Alur peminjaman komponen', () => {
  beforeAll(async () => {
    await resetDatabase();
    const fixtures = await seedFixtures();
    componentId = fixtures.component.id;
    adminToken = await login('admin', 'admin123');
    userToken = await login('mahasiswa1', 'user123');
  });

  afterAll(async () => {
    await disconnect();
  });

  it('user mengajukan peminjaman dengan status Pending', async () => {
    const res = await request(app)
      .post('/api/loans')
      .set(auth(userToken))
      .send({
        dueDate: '2030-01-01',
        notes: 'Untuk praktikum IoT',
        items: [{ componentId, quantity: 2 }]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(LoanStatus.Pending);
  });

  it('stok belum berubah sebelum peminjaman disetujui', async () => {
    const component = await prisma.component.findUnique({ where: { id: componentId } });
    expect(component!.stockAvailable).toBe(10);
  });

  it('peminjaman melebihi stok ditolak (422)', async () => {
    const res = await request(app)
      .post('/api/loans')
      .set(auth(userToken))
      .send({ dueDate: '2030-01-01', items: [{ componentId, quantity: 999 }] });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('STOCK_INSUFFICIENT');
  });

  it('admin menyetujui peminjaman dan stok tersedia berkurang', async () => {
    const loan = await prisma.loan.findFirst({ where: { user: { username: 'mahasiswa1' } } });
    expect(loan).toBeTruthy();

    const res = await request(app)
      .put(`/api/loans/${loan!.id}/approve`)
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(LoanStatus.Borrowed);

    const component = await prisma.component.findUnique({ where: { id: componentId } });
    expect(component!.stockAvailable).toBe(8);
    expect(component!.stockTotal).toBe(10);
  });

  it('menyetujui ulang peminjaman yang sama ditolak (400)', async () => {
    const loan = await prisma.loan.findFirst({ where: { status: LoanStatus.Borrowed } });

    const res = await request(app)
      .put(`/api/loans/${loan!.id}/approve`)
      .set(auth(adminToken));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATUS');
  });

  it('user tidak boleh menyetujui peminjaman (403)', async () => {
    const loan = await prisma.loan.create({
      data: {
        userId: (await prisma.user.findUnique({ where: { username: 'mahasiswa1' } }))!.id,
        loanDate: new Date(),
        dueDate: new Date('2030-01-01'),
        status: LoanStatus.Pending
      }
    });

    const res = await request(app)
      .put(`/api/loans/${loan.id}/approve`)
      .set(auth(userToken));

    expect(res.status).toBe(403);
  });

  it('pengembalian mengembalikan stok dan menutup status', async () => {
    const loan = await prisma.loan.findFirst({
      where: { status: LoanStatus.Borrowed },
      include: { details: true }
    });
    expect(loan).toBeTruthy();

    const res = await request(app)
      .put(`/api/loans/${loan!.id}/return`)
      .set(auth(adminToken))
      .send({
        items: loan!.details.map((d) => ({ loanDetailId: d.id, conditionAfter: 'Good' }))
      });

    expect(res.status).toBe(200);

    const component = await prisma.component.findUnique({ where: { id: componentId } });
    expect(component!.stockAvailable).toBe(10);
  });

  it('user hanya melihat peminjaman miliknya sendiri', async () => {
    const res = await request(app).get('/api/loans').set(auth(userToken));

    expect(res.status).toBe(200);
    const list = res.body.data?.items || res.body.data;
    const usernames = Array.isArray(list) ? list.map((l: any) => l.user?.username) : [];
    expect(usernames.every((u: string | undefined) => u === 'mahasiswa1')).toBe(true);
  });

  it('perubahan status peminjaman tercatat di audit log', async () => {
    const res = await request(app)
      .get('/api/audit-logs?entityType=Loan')
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    const actions = res.body.data.map((item: any) => item.action);
    expect(actions).toContain('loan.create');
    expect(actions).toContain('loan.approve');
    expect(actions).toContain('loan.return');
  });
});
