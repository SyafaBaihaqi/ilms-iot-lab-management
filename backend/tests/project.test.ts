import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import {
  resetDatabase,
  seedFixtures,
  disconnect,
  ADMIN_CREDENTIALS,
  MAHASISWA_CREDENTIALS,
  USER_CREDENTIALS
} from './helpers';

let adminToken = '';
let mahasiswaToken = '';
let userToken = '';
let studentId = '';

const login = async (username: string, password: string) => {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  expect(res.status).toBe(200);
  return res.body.data.accessToken as string;
};

const newProject = (overrides: Record<string, any> = {}) => ({
  title: `Proyek Uji ${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  category: 'IoT',
  description: 'Deskripsi proyek pengujian otomatis untuk fitur portofolio proyek.',
  techStack: 'ESP32, Arduino',
  tags: ['IoT', 'Test'],
  highlights: ['Featured'],
  authorName: 'Penulis Uji',
  authorRole: 'Mahasiswa',
  ...overrides
});

describe('Portofolio Proyek', () => {
  beforeAll(async () => {
    await resetDatabase();
    const fixtures = await seedFixtures();
    studentId = fixtures.mahasiswa.id;
    adminToken = await login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    mahasiswaToken = await login(MAHASISWA_CREDENTIALS.username, MAHASISWA_CREDENTIALS.password);
    userToken = await login(USER_CREDENTIALS.username, USER_CREDENTIALS.password);
  });

  afterAll(async () => {
    await disconnect();
  });

  it('semua peran dapat melihat daftar proyek', async () => {
    const res = await request(app).get('/api/projects').set('Authorization', `Bearer ${mahasiswaToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('admin dapat menambah proyek beserta identitas author', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newProject());

    expect(res.status).toBe(201);
    expect(res.body.data.title).toContain('Proyek Uji');
    expect(res.body.data.authorName).toBe('Penulis Uji');
    expect(res.body.data.highlights).toContain('Featured');
  });

  it('admin dapat memakai user terdaftar sebagai author (nama & role terisi otomatis)', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newProject({ authorId: studentId, authorName: undefined, authorRole: undefined, isStudentProject: true }));

    expect(res.status).toBe(201);
    expect(res.body.data.authorName).toBe('Mahasiswa Role Test');
    expect(res.body.data.authorRole).toBe('Mahasiswa');
    expect(res.body.data.isStudentProject).toBe(true);
  });

  it('mahasiswa dan user tidak dapat menambah proyek', async () => {
    const asMahasiswa = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${mahasiswaToken}`)
      .send(newProject());
    expect(asMahasiswa.status).toBe(403);

    const asUser = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send(newProject());
    expect(asUser.status).toBe(403);
  });

  it('filter highlight dan proyek mahasiswa berjalan', async () => {
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newProject({ title: 'Proyek Trending', highlights: ['Trending'], isStudentProject: true }));

    const featured = await request(app)
      .get('/api/projects?highlight=Featured')
      .set('Authorization', `Bearer ${mahasiswaToken}`);
    expect(featured.status).toBe(200);
    expect(featured.body.data.every((p: any) => p.highlights.includes('Featured'))).toBe(true);

    const student = await request(app)
      .get('/api/projects?student=true')
      .set('Authorization', `Bearer ${mahasiswaToken}`);
    expect(student.status).toBe(200);
    expect(student.body.data.every((p: any) => p.isStudentProject)).toBe(true);
  });

  it('statistik proyek tersedia untuk semua peran', async () => {
    const res = await request(app).get('/api/projects/stats').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('featured');
    expect(res.body.data).toHaveProperty('student');
  });

  it('admin dapat mengubah dan menghapus proyek', async () => {
    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newProject({ title: 'Proyek Akan Diubah' }));
    const id = created.body.data.id;

    const updated = await request(app)
      .put(`/api/projects/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Proyek Sudah Diubah', highlights: ['Star'] });
    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe('Proyek Sudah Diubah');
    expect(updated.body.data.highlights).toEqual(['Star']);

    const removed = await request(app)
      .delete(`/api/projects/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removed.status).toBe(200);

    const afterDelete = await request(app)
      .get(`/api/projects/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterDelete.status).toBe(404);
  });

  it('mahasiswa tidak dapat mengubah atau menghapus proyek', async () => {
    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newProject());
    const id = created.body.data.id;

    const update = await request(app)
      .put(`/api/projects/${id}`)
      .set('Authorization', `Bearer ${mahasiswaToken}`)
      .send({ title: 'Dicoba Ubah' });
    expect(update.status).toBe(403);

    const remove = await request(app)
      .delete(`/api/projects/${id}`)
      .set('Authorization', `Bearer ${mahasiswaToken}`);
    expect(remove.status).toBe(403);
  });

  it('menolak proyek tanpa identitas author', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newProject({ authorName: undefined, authorRole: undefined }));

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('AUTHOR_REQUIRED');
  });

  it('wajib terautentikasi untuk mengakses proyek', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });
});
