import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';
import { TicketStatus } from '@prisma/client';
import { resetDatabase, seedFixtures, disconnect } from './helpers';

let adminToken = '';
let userToken = '';
let otherToken = '';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const login = async (username: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body.data.accessToken as string;
};

describe('Customer Service (Ticketing)', () => {
  beforeAll(async () => {
    await resetDatabase();
    await seedFixtures();
    adminToken = await login('admin', 'admin123');
    userToken = await login('mahasiswa1', 'user123');
    otherToken = await login('mahasiswa2', 'user123');
  });

  afterAll(async () => {
    await disconnect();
  });

  it('user dapat membuat tiket baru (201)', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set(auth(userToken))
      .send({
        subject: 'Komponen tidak tersedia di rak',
        message: 'Saya tidak menemukan resistor yang diminta setelah mengambil.',
        priority: 'Medium'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(TicketStatus.Open);
    expect(res.body.data.subject).toBe('Komponen tidak tersedia di rak');
  });

  it('user hanya melihat tiket miliknya sendiri', async () => {
    await request(app)
      .post('/api/tickets')
      .set(auth(otherToken))
      .send({
        subject: 'Pertanyaan lain',
        message: 'Ini tiket milik pengguna lain untuk pengujian.'
      });

    const res = await request(app).get('/api/tickets').set(auth(userToken));

    expect(res.status).toBe(200);
    const list = res.body.data?.items || res.body.data;
    const owners = Array.isArray(list) ? list.map((t: any) => t.user?.username) : [];
    expect(owners.every((u: string | undefined) => u === 'mahasiswa1')).toBe(true);
  });

  it('admin melihat semua tiket', async () => {
    const res = await request(app).get('/api/tickets').set(auth(adminToken));

    expect(res.status).toBe(200);
    const list = res.body.data?.items || res.body.data;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it('user tidak boleh mengakses detail tiket milik orang lain (403)', async () => {
    const otherTicket = await prisma.ticket.findFirst({
      where: { user: { username: 'mahasiswa2' } }
    });

    const res = await request(app)
      .get(`/api/tickets/${otherTicket!.id}`)
      .set(auth(userToken));

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('admin dapat membalas tiket', async () => {
    const ticket = await prisma.ticket.findFirst({
      where: { user: { username: 'mahasiswa1' } }
    });

    const res = await request(app)
      .post(`/api/tickets/${ticket!.id}/replies`)
      .set(auth(adminToken))
      .send({ message: 'Sudah kami cek, stok tersedia. Silakan ke bagian administrasi.' });

    expect(res.status).toBe(201);
  });

  it('balasan admin otomatis memindahkan tiket Open menjadi In_Progress', async () => {
    const ticket = await prisma.ticket.findFirst({
      where: { user: { username: 'mahasiswa1' } },
      orderBy: { createdAt: 'asc' }
    });

    expect(ticket!.status).toBe(TicketStatus.In_Progress);
  });

  it('balasan tiket tercatat di audit log', async () => {
    const res = await request(app)
      .get('/api/audit-logs?entityType=Ticket')
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    const actions = res.body.data.map((item: any) => item.action);
    expect(actions).toContain('ticket.create');
    expect(actions).toContain('ticket.reply');
  });

  it('admin dapat memperbarui status dan prioritas tiket', async () => {
    const ticket = await prisma.ticket.findFirst({
      where: { user: { username: 'mahasiswa1' } }
    });

    // Enum Prisma memakai In_Progress; UI memformatnya menjadi "In Progress".
    const res = await request(app)
      .put(`/api/tickets/${ticket!.id}`)
      .set(auth(adminToken))
      .send({ status: 'Resolved', priority: 'High' });

    expect(res.status).toBe(200);
  });

  it('validasi Zod menolak subjek terlalu pendek (400)', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set(auth(userToken))
      .send({ subject: 'Halo', message: 'Pesan yang cukup panjang untuk validasi minimum karakter.' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('statistik tiket bisa diakses admin', async () => {
    const res = await request(app).get('/api/tickets/stats').set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('Open');
  });

  it('user biasa tidak boleh menghapus tiket (403)', async () => {
    const ticket = await prisma.ticket.findFirst({
      where: { user: { username: 'mahasiswa2' } }
    });

    const res = await request(app).delete(`/api/tickets/${ticket!.id}`).set(auth(userToken));

    expect(res.status).toBe(403);
  });

  it('admin dapat menutup tiket', async () => {
    const ticket = await prisma.ticket.findFirst({
      where: { user: { username: 'mahasiswa1' }, status: { not: TicketStatus.Closed } }
    });

    const res = await request(app).put(`/api/tickets/${ticket!.id}/close`).set(auth(adminToken));

    expect(res.status).toBe(200);
  });
});
