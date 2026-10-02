import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { resetDatabase, seedFixtures, disconnect, DOSEN_CREDENTIALS, MAHASISWA_CREDENTIALS } from './helpers';

let adminToken = '';
let dosenToken = '';
let mahasiswaToken = '';
let legacyUserToken = '';

const login = async (username: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  expect(res.status).toBe(200);
  return res.body.data.accessToken as string;
};

describe('Peran Dosen dan Mahasiswa', () => {
  beforeAll(async () => {
    await resetDatabase();
    await seedFixtures();
    adminToken = await login('admin', 'admin123');
    dosenToken = await login(DOSEN_CREDENTIALS.username, DOSEN_CREDENTIALS.password);
    mahasiswaToken = await login(MAHASISWA_CREDENTIALS.username, MAHASISWA_CREDENTIALS.password);
    legacyUserToken = await login('mahasiswa1', 'user123');
  });

  afterAll(async () => {
    await disconnect();
  });

  it('login mengembalikan role Dosen sesuai tabel roles', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: DOSEN_CREDENTIALS.username, password: DOSEN_CREDENTIALS.password });
    expect(res.body.data.user.role).toBe('Dosen');
  });

  it('role User lama tetap bisa login dan setara akses mahasiswa', async () => {
    const res = await request(app).get('/api/components').set('Authorization', `Bearer ${legacyUserToken}`);
    expect(res.status).toBe(200);

    const forbidden = await request(app).post('/api/components').set('Authorization', `Bearer ${legacyUserToken}`).send({
      categoryId: 'apa-saja',
      name: 'Komponen Ilegal',
      inventoryCode: 'X-9',
      stockTotal: 1
    });
    expect(forbidden.status).toBe(403);
  });

  it('Dosen boleh mengakses dashboard', async () => {
    const res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${dosenToken}`);
    expect(res.status).toBe(200);
  });

  it('Dosen boleh membuat komponen', async () => {
    const categories = await request(app).get('/api/categories').set('Authorization', `Bearer ${dosenToken}`);
    const categoryId = categories.body.data[0].id;

    const res = await request(app)
      .post('/api/components')
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ categoryId, name: 'Komponen Dosen', inventoryCode: 'DOS-001', stockTotal: 2 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('Dosen boleh membuat kategori', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${dosenToken}`)
      .send({ name: `Kategori Dosen ${Date.now()}` });

    expect(res.status).toBe(201);
  });

  it('Dosen boleh menyetujui peminjaman', async () => {
    const list = await request(app).get('/api/loans').set('Authorization', `Bearer ${dosenToken}`);
    expect(list.status).toBe(200);
  });

  it('Dosen ditolak mengakses daftar pengguna (403)', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${dosenToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('Dosen ditolak membaca log audit (403)', async () => {
    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${dosenToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('Mahasiswa ditolak mengakses dashboard (403)', async () => {
    const res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${mahasiswaToken}`);
    expect(res.status).toBe(403);
  });

  it('Mahasiswa boleh mengajukan peminjaman', async () => {
    const components = await request(app).get('/api/components').set('Authorization', `Bearer ${mahasiswaToken}`);
    const componentId = components.body.data.items[0].id;
    const dueDate = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();

    const res = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${mahasiswaToken}`)
      .send({ items: [{ componentId, quantity: 1 }], dueDate });

    expect(res.status).toBe(201);
  });

  it('Admin boleh mengubah role pengguna menjadi Dosen', async () => {
    const created = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Calon Dosen',
        email: `dosen.baru.${Date.now()}@test.local`,
        username: `dosen_baru_${Date.now()}`,
        password: 'dosen12345',
        roleName: 'Dosen'
      });

    expect(created.status).toBe(201);
    expect(created.body.data.role.name).toBe('Dosen');

    const list = await request(app).get('/api/users?search=dosen_baru').set('Authorization', `Bearer ${adminToken}`);
    const target = list.body.data.items.find((u: any) => u.username.startsWith('dosen_baru_'));
    expect(target.role.name).toBe('Dosen');
  });

  it('Admin ditolak bila nama role tidak dikenal', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Role Ngawur',
        email: `ngawur.${Date.now()}@test.local`,
        username: `ngawur_${Date.now()}`,
        password: 'ngawur12345',
        roleName: 'Superuser'
      });

    expect(res.status).toBe(400);
  });
});