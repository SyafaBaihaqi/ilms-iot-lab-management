import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { resetDatabase, seedFixtures, disconnect } from './helpers';

let adminToken = '';
let userToken = '';

const login = async (username: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body.data.accessToken as string;
};

describe('Otorisasi berbasis peran (RBAC)', () => {
  beforeAll(async () => {
    await resetDatabase();
    await seedFixtures();
    adminToken = await login('admin', 'admin123');
    userToken = await login('mahasiswa1', 'user123');
  });

  afterAll(async () => {
    await disconnect();
  });

  it('admin boleh mengakses daftar pengguna', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('user biasa ditolak mengakses daftar pengguna (403)', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('user biasa boleh melihat inventori (baca)', async () => {
    const res = await request(app)
      .get('/api/components')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('user biasa tidak boleh membuat komponen (403)', async () => {
    const res = await request(app)
      .post('/api/components')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ categoryId: 'apa-saja', name: 'Komponen Ilegal', inventoryCode: 'X-1', stockTotal: 1 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('admin boleh membaca log audit', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('user biasa tidak boleh membaca log audit (403)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
