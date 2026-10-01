import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import {
  resetDatabase,
  seedFixtures,
  disconnect,
  ADMIN_CREDENTIALS,
  USER_CREDENTIALS
} from './helpers';

describe('Autentikasi', () => {
  beforeAll(async () => {
    await resetDatabase();
    await seedFixtures();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('health check mengembalikan status ok tanpa token', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
  });

  it('login dengan username berhasil', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: ADMIN_CREDENTIALS.username, password: ADMIN_CREDENTIALS.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('Admin');
  });

  it('login dengan NIM berhasil', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '2022101', password: USER_CREDENTIALS.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(USER_CREDENTIALS.username);
  });

  it('login dengan email berhasil', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'user@test.local', password: USER_CREDENTIALS.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(USER_CREDENTIALS.username);
  });

  it('login dengan nomor HP berhasil', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '081298765432', password: USER_CREDENTIALS.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(USER_CREDENTIALS.username);
  });

  it('password salah ditolak dengan 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: ADMIN_CREDENTIALS.username, password: 'password-salah' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('login tanpa field wajib ditolak oleh validasi Zod (400)', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('endpoint terlindungi menolak permintaan tanpa token', async () => {
    const res = await request(app).get('/api/components');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('token tidak valid ditolak dengan 401', async () => {
    const res = await request(app)
      .get('/api/components')
      .set('Authorization', 'Bearer token-ngawur');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });
});
