# Panduan Deployment Produksi — ILMS

Hosting **gratis** untuk ILMS (tugas akhir), plus jalur alternatif VPS murah.
Semua biaya = Rp 0. Repo harus **private**.

## Arsitektur Produksi (Pilihan Utama)

```
[ Browser (PWA) ] --> [ Vercel / Cloudflare Pages :443 ]   (frontend statis, tidak pernah tidur)
                            |
                            v  VITE_API_BASE_URL
[ ESP32 / Browser ] -> [ Cloudflare DNS ] --> [ Render Free Web Service :443 ]  (Node + Express)
                                                   |
                                                   v
                                            [ Neon Free (PostgreSQL) ]
```

Stack:

| Bagian | Penyedia | 왜 |
|---|---|---|
| Frontend | Vercel Hobby / Cloudflare Pages | Hosting statis gratis, HTTPS otomatis, tidak pernah tidur |
| Backend | Render Free Web Service | Node/Express + JWT, 750 jam/bulan (cukup untuk 24/7 = 744 jam) |
| Database | Neon Free | PostgreSQL permanen gratis, 0,5 GB, tanpa kartu kredit |
| Keep-alive | GitHub Actions (cron 10 menit) | Mencegah Render Free tidur setelah 15 menit idle |
| DNS + TLS | Cloudflare | Delegasi domain, custom domain HTTPS otomatis |

> Render Free **tidur setelah 15 menit tanpa request** dan butuh ±30–60 detik untuk bangun.
> Keep-alive cron mencegah tidur tersebut. ESP32 yang rutin mengirim data juga menjaga instance tetap hidup.

## Prasyarat

- GitHub CLI sudah login (`gh auth login`)
- Akun Neon, Render, Vercel (semuanya free tier, tanpa kartu kredit)
- Domain dikelola di Cloudflare (`saiasyap.my.id`)

## 1. Push ke GitHub

```bash
git init -b main
git add .
git commit -m "feat: ILMS - sistem manajemen laboratorium & perangkat IoT"
gh repo create ilms-iot-lab-management --private --source . --push
```

## 2. Database — Neon (Free)

1. Login https://console.neon.tech → **Create project** (mis. `ilms`, region Singapore/Jakarta bila ada).
2. Dari dashboard, salin **connection string**. Untuk Render (selalu aktif) gunakan koneksi langsung, bukan pooler:
   `postgresql://USER:PASSWORD@ep-xxx.region.neon.tech/ilms?sslmode=require`
3. Terapkan schema + seed **dari komputer lokal** (paling mudah, satu kali):

```bash
# PowerShell, ganti nilainya dengan connection string Neon
$env:DATABASE_URL = "postgresql://USER:PASSWORD@ep-xxx.region.neon.tech/ilms?sslmode=require"
cd backend
npx prisma db push
npm run prisma:seed
```

`seed` bersifat idempotent (upsert): role, akun demo (`admin`, `mahasiswa1`, `user`), 9 kategori, 72 komponen, 1 device ESP32, data peminjaman contoh.

> **Penting:** proyek ini memakai `prisma db push` dan **tidak memiliki folder `prisma/migrations`**.
> Jangan menjalankan `prisma migrate deploy` — perintah itu tidak akan melakukan apa-apa.

4. Verifikasi cepat dengan Prisma Studio (opsional, hanya lokal):

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@ep-xxx.region.neon.tech/ilms?sslmode=require"
npx prisma studio
```

Arahkan kursor ke tabel `components` — harus berisi 72 baris.

## 3. Backend — Render (Free)

**Cara cepat (Blueprint):** di Render → **New → Blueprint** → pilih repo ini. File `render.yaml` sudah berisi build command, start command, dan daftar env var.

**Cara manual:**

| Field | Nilai |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm ci && npx prisma generate && npm run build` |
| Start Command | `node dist/app.js` |
| Health Check Path | `/api/health` |
| Plan | Free |

Environment variables (Render dashboard):

| Key | Nilai |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | connection string Neon (langkah 2) |
| `JWT_SECRET` | **secret acak baru** — `openssl rand -base64 48` |
| `REFRESH_SECRET` | **secret acak baru** — `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | `1d` |
| `REFRESH_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://ilms.saiasyap.my.id` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | `120` |
| `IOT_OFFLINE_THRESHOLD_MINUTES` | `2` |

> `JWT_SECRET`/`REFRESH_SECRET` di Render **jangan** sama dengan nilai contoh di `.env.example`.
> `PORT` diberikan Render secara otomatis.

Setelah aktif, tambahkan **custom domain** di Render: `ilms-api.saiasyap.my.id`
(CNAME → `ilms-backend.onrender.com`). Render otomatis menyediakan sertifikat TLS.

## 4. Keep-Alive (GitHub Actions)

Workflow `.github/workflows/keep-alive.yml` sudah terpasang (cron `*/10 * * * *`).

Aktifkan di GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `API_BASE_URL` | `https://ilms-api.saiasyap.my.id/api` |

> GitHub menonaktifkan workflow terjadwal pada repo tanpa aktivitas > 60 hari. Cek tab **Actions** sesekali.

## 5. Frontend — Vercel (gratis)

| Field | Nilai |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Install / Build | `npm install` / `npm run build` |
| Output Directory | `dist` |

Environment variables:

| Key | Nilai |
|---|---|
| `VITE_API_BASE_URL` | `https://ilms-api.saiasyap.my.id/api` |

`frontend/vercel.json` sudah menyertakan **rewrite SPA** — wajib, karena seluruh route memakai React Router (`/login`, `/support`, `/inventory`) dan tanpa rewrite akan 404 saat refresh. Header cache juga diatur agar `index.html`/`sw.js` tidak ngadat (penting untuk PWA).

Tambahkan domain `ilms.saiasyap.my.id` di Vercel → **Settings → Domains** (DNS otomatis via Cloudflare).

### Alternatif: Cloudflare Pages (gratis, tanpa batas bandwidth)

| Field | Nilai |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Root directory | `frontend` |

Env `VITE_API_BASE_URL` diisi di **Settings → Environment variables**. File `frontend/public/_redirects` sudah menangani fallback SPA.

## 6. Device ESP32

Arahkan firmware ke endpoint HTTPS backend baru:

```
https://ilms-api.saiasyap.my.id/api
```

API key tetap yang di-seed: `ilms_esp32_dev_secret_key_123`.
Header yang dipakai: `X-API-Key`.

## 7. Update Deployment

```bash
git add . && git commit -m "fix: perbaiki tampilan halaman inventori"
git push
```

Render dan Vercel melakukan auto-deploy. Untuk perubahan **schema** (Prisma), jalankan `prisma db push` ke Neon secara manual (langkah 2) — Render tidak menjalankan migrasi otomatis.

## 8. Batas Paket Gratis (tidak disembunyikan)

| Layanan | Batas | Dampak |
|---|---|---|
| Render Free | 750 jam instance/bulan, tidur 15 menit idle | perlu keep-alive; kuota habis tanpa kartu → suspend sampai awal bulan |
| Render Free | 512 MB RAM, 0.1 vCPU | Cukup untuk demo; jangan tambah proses berat |
| Render Free Postgres | Expires 30 hari | **Jangan dipakai** — gunakan Neon |
| Neon Free | 0,5 GB storage, 100 CU-jam/project/bulan | Jauh cukup untuk data tugas akhir (72 komponen + transaksi) |
| Vercel Hobby | Hobby plan, tanpa Sleep | Aman untuk traffic tugas akhir |
| GitHub Actions | Cron nonaktif jika repo idle > 60 hari | Cek berkala |

## 9. Troubleshooting

| Gejala | Penyebab & Solusi |
|---|---|
| Halaman putih / 404 setelah refresh | Rewrite SPA belum aktif — deploy ulang Vercel agar `vercel.json` terbaca, atau cek `_redirects` untuk Cloudflare Pages |
| Tampilan versi lama (bundle lama) | Hard reload `Ctrl+Shift+R`. Bila tetap sama: DevTools → Application → Service Workers → Unregister + Clear site data |
| Slow loading ~30–60 detik | Render Free sedang bangun dari sleep. Perpendik dengan keep-alive |
| `500` / `Cannot reach database server` | `DATABASE_URL` salah atau `sslmode=require` hilang pada connection string Neon |
| `403` dari API | `CORS_ORIGIN` tidak cocok dengan domain frontend |
| `Module not found: @prisma/client` | `npx prisma generate` belum jalan — pastikan ada di Build Command |
| Build gagal di Render | `npm ci` membutuhkan `package-lock.json` yang sudah di-commit |
| ESP32 offline di dashboard | URL perangkat masih menunjuk endpoint lama/tunnel; update firmware |

## 10. Jalur Alternatif — VPS Murah (24/7 tanpa tidur)

Bila perlu uptime tanpa cold start, Rp 65–95 ribu/bulan sudah cukup:

| Provider | Spesifikasi termurah |
|---|---|
| Hetzner Cloud | CX22/CX23 — 2 vCPU, 4 GB RAM, ~€4,5–6 |
| DigitalOcean | Basic Droplet — 1 GB RAM, $4 |
| UpCloud / Contabo | €3,5–4,5 (perhatikan reputasi overselling) |

Langkah: Ubuntu 24.04 → Docker Compose (PostgreSQL + backend + **Caddy** sebagai reverse proxy HTTPS otomatis) → Cloudflare DNS A record ke IP VPS → `git pull && docker compose up -d`.

Semua pekerjaan lokal (tunnel Cloudflare, `mulai-online.bat`, `serve-online.mjs`) tetap berguna sebagai mode **development/lokal demo**.

## 11. Checklist Keamanan Produksi

- [ ] Repo GitHub **private**
- [ ] `.env` tidak pernah di-commit (dicek oleh `.gitignore`)
- [ ] `JWT_SECRET` & `REFRESH_SECRET` di hosting = nilai baru, bukan dari `.env.example`
- [ ] `CORS_ORIGIN` hanya berisi domain frontend
- [ ] HTTPS untuk frontend, API, dan endpoint ESP32
- [ ] Rate limiting aktif (default `express-rate-limit` + limit khusus device)
- [ ] Ganti password akun `admin` sebelum presentasi
- [ ] API key device ESP32 disimpan di NVS firmware, tidak di source
