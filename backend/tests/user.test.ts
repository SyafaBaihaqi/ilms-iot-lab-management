import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { resetDatabase, seedFixtures, disconnect } from './helpers';

let adminToken = '';

const login = async (username: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body.data.accessToken as string;
};

const createUser = (payload: Record<string, unknown>) =>
  request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send(payload);

describe('Manajemen pengguna - field NIM', () => {
  beforeAll(async () => {
    await resetDatabase();
    await seedFixtures();
    adminToken = await login('admin', 'admin123');
  });

  afterAll(async () => {
    await resetDatabase();
    await disconnect();
  });

  it('admin bisa membuat user dengan NIM', async () => {
    const res = await createUser({
      fullName: 'Budi Santoso',
      email: 'budi@student.test',
      username: 'budi',
      password: 'budi12345',
      nim: '2210999',
      phone: '081200000001',
      roleName: 'User'
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nim).toBe('2210999');
  });

  it('NIM tersimpan dan bisa dipakai untuk login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '2210999', password: 'budi12345' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.nim).toBe('2210999');
  });

  it('NIM muncul di response /api/auth/me', async () => {
    const token = await login('2210999', 'budi12345');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.nim).toBe('2210999');
  });

  it('NIM wajib unik - duplikat ditolak (409)', async () => {
    const res = await createUser({
      fullName: 'Budi Duplikat',
      email: 'budi2@student.test',
      username: 'budiduplikat',
      password: 'budi12345',
      nim: '2210999',
      roleName: 'User'
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('USER_EXISTS');
  });

  it('NIM yang sama milik user lain juga ditolak', async () => {
    const res = await createUser({
      fullName: 'Salin NIM',
      email: 'salin@student.test',
      username: 'salin',
      password: 'salin12345',
      nim: '2022101',
      roleName: 'User'
    });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('USER_EXISTS');
  });

  it('NIM opsional - user admin boleh dibuat tanpa NIM', async () => {
    const res = await createUser({
      fullName: 'Admin Tanpa NIM',
      email: 'admin2@ilms.test',
      username: 'admin2',
      password: 'admin12345',
      roleName: 'Admin'
    });

    expect(res.status).toBe(201);
    expect(res.body.data.nim).toBeNull();
  });

  it('NIM invalid ditolak (400)', async () => {
    const res = await createUser({
      fullName: 'NIM Sembarangan',
      email: 'sembarangan@student.test',
      username: 'sembarangan',
      password: 'sembarangan123',
      nim: 'NIM#INVALID!',
      roleName: 'User'
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('daftar pengguna bisa dicari berdasarkan NIM', async () => {
    const res = await request(app)
      .get('/api/users?search=2210999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].nim).toBe('2210999');
  });

  it('daftar pengguna menyertakan kolom NIM', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const budi = res.body.data.items.find((u: any) => u.username === 'budi');
    expect(budi).toBeDefined();
    expect(budi.nim).toBe('2210999');
  });

  it('NIM bisa diubah saat edit user', async () => {
    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    const budi = list.body.data.items.find((u: any) => u.username === 'budi');

    const res = await request(app)
      .put(`/api/users/${budi.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nim: '2210888' });

    expect(res.status).toBe(200);
    expect(res.body.data.nim).toBe('2210888');
  });

  it('NIM tidak bisa diubah menjadi milik user lain (409)', async () => {
    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    const budi = list.body.data.items.find((u: any) => u.username === 'budi');

    const res = await request(app)
      .put(`/api/users/${budi.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nim: '2022102' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('USER_EXISTS');
  });

  it('NIM dapat dikosongkan (jadi null)', async () => {
    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    const budi = list.body.data.items.find((u: any) => u.username === 'budi');

    const res = await request(app)
      .put(`/api/users/${budi.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nim: null });

    expect(res.status).toBe(200);
    expect(res.body.data.nim).toBeNull();
  });

  it('audit log mencatat pembuatan user beserta NIM', async () => {
    const res = await request(app)
      .get('/api/audit-logs?entityType=User&action=user.create')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].action).toBe('user.create');
  });
});
