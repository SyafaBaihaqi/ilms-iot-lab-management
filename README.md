# IoT Lab Management System (ILMS)

Sistem manajemen laboratorium IoT berbasis web: manajemen inventaris komponen, peminjaman-pengembalian, audit stok, perangkat IoT (ESP32), serta monitoring data sensor. Dibangun modular: **MVP → Portfolio+ → IoT Dasar → IoT Lanjutan**.

## Fitur

- Autentikasi & RBAC (Admin / Dosen / Mahasiswa / User) dengan JWT + Refresh Token
- Manajemen komponen, kategori, stok real-time, dan riwayat stok
- Alur peminjaman-pengembalian (ajukan → approve/reject → return) yang dibungkus transaksi database
- Dashboard statistik (Admin/Dosen), Dashboard Mahasiswa, dan Dashboard sederhana untuk User
- Laporan inventaris/peminjaman/kerusakan/IoT dengan ekspor CSV, Excel (.xlsx), dan PDF (multi halaman)
- Surat peminjaman komponen per transaksi (PDF) untuk Admin/Dosen
- PWA: installable + offline shell (service worker via vite-plugin-pwa)
- Integrasi ESP32: registrasi, heartbeat, dan pengiriman data sensor via API key khusus
- Notifikasi in-app, log audit lengkap (aktor, aksi, entitas, IP), deteksi device offline, penandaan peminjaman overdue
- Customer Service: ticketing dengan status, prioritas, thread balasan, dan notifikasi ke staff
- QR Code label inventaris per komponen (PNG/SVG, siap cetak) + pemindaian QR cepat di halaman Inventori
- Pengujian otomatis (Vitest + Supertest): auth, RBAC, peminjaman, inventori, audit, ticketing, laporan & surat peminjaman
- E2E smoke test (headless browser) untuk pemindaian QR dan hak akses per peran

## Arsitektur

```
Client (PWA) ──HTTPS──> API (Express/TS) ──> Business Logic (Services) ──> ORM (Prisma) ──> PostgreSQL
ESP32 + Sensor ──HTTP──> REST API (API Key) ──> Business Logic ──> Database
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, PWA (Workbox) |
| Backend | Node.js, Express, TypeScript, Zod, JWT |
| Database | PostgreSQL, Prisma ORM |
| IoT | ESP32, ArduinoJson, DHT22, HC-SR04 |

## Struktur Repositori

```
ilms/
├── backend/          # REST API (Express + Prisma)
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── middlewares/
│       ├── routes/
│       ├── validators/
│       └── jobs/
├── frontend/         # React PWA
├── iot/esp32/        # Firmware ESP32 (Arduino / PlatformIO)
├── database/         # DDL PostgreSQL manual
└── docs/
```

## Instalasi Lokal

**Prasyarat:** Node.js ≥ 18, PostgreSQL (atau `docker compose up -d`).

```bash
# 1. Database
docker compose up -d          # atau gunakan PostgreSQL lokal/Supabase

# 2. Backend
cd backend
cp .env.example .env          # sesuaikan DATABASE_URL
npm install
npx prisma db push                # proyek ini memakai db push (tanpa folder migrations)
npm run prisma:seed               # akun demo: admin/admin123, mahasiswa1/user123, user/user123
npm run dev                       # http://localhost:5000

# 3. Frontend (terminal baru)
cd frontend
npm install
npm run dev                   # http://localhost:5173

# 4. ESP32
#   - Arduino IDE: buka iot/esp32/sensor_node.ino, isi config.h
#   - PlatformIO : cd iot/esp32 && pio run --target upload
```

## Akun Demo

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Dosen | *(tidak disertakan, buat melalui Admin)* | `dosen12345` |
| Mahasiswa | `mahasiswa1` | `user123` |
| User | `user` | `user123` |

Login menerima **username, NIM, email, atau nomor HP** (field login berlabel `Username / NIM / Email / No. HP`). Role Dosen memiliki akses operasional lab (dashboard, kategori, perangkat, monitoring sensor, laporan, persetujuan peminjaman, ticketing) namun **tidak** memiliki akses Manajemen Pengguna dan Log Audit. Role Mahasiswa dan User (alias umum) setara sebagai peminjam.

## API Ringkas

| Endpoint | Auth | Deskripsi |
|---|---|---|
| `POST /api/auth/login` | Public | Login → access + refresh token |
| `POST /api/devices/register` | Public+Secret | ESP32 mendaftar, mendapat API key |
| `POST /api/devices/heartbeat` | API Key | ESP32 memberi tanda online |
| `POST /api/sensors/readings/batch` | API Key | ESP32 mengirim data sensor |
| `GET /api/dashboard/summary` | JWT Staff | Statistik dashboard (Admin/Dosen) |
| `GET /api/reports/:type` | JWT Staff | Laporan (json/csv/xlsx/pdf) |
| `GET /api/loans/:id/letter` | JWT Staff | Surat peminjaman (json/pdf) |

## Testing

Pengujian otomatis memakai **Vitest + Supertest** terhadap database terpisah (`ilms_test`), sehingga data demo `ilms_db` tidak tersentuh.

```bash
# sekali saja: buat database + schema untuk test
docker exec ilms_postgres psql -U postgres -d postgres -c "CREATE DATABASE ilms_test;"
cd backend
$env:TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ilms_test?schema=public"
npm run test:db:setup

# jalankan test
npm test              # sekali jalan
npm run test:watch    # mode watch
```

Cakupan test: autentikasi (username/NIM/email/HP, password salah, token tidak valid), RBAC (Admin/Dosen/Mahasiswa/User), alur peminjaman (stok, approve, pengembalian, 422 stok kurang), komponen + stok + QR Code, log audit, ticketing (ownership, balasan, perubahan status), laporan (CSV/XLSX/PDF + filter), surat peminjaman, dan manajemen pengguna (NIM unik/opsional, login pakai NIM).

## Deployment (Production)

Paket **gratis** (Neon + Render + Vercel + GitHub Actions keep-alive), jalur VPS murah, dan
troubleshooting ada di **`docs/DEPLOYMENT.md`**. Domain produksi: `ilms.saiasyap.my.id`.

Untuk demo lokal tanpa hosting: double-click `mulai-online.bat`
(atau ikuti `panduan/02_MENJALANKAN_Online.txt`) — menjalankan PostgreSQL, backend, server frontend,
dan Cloudflare Tunnel sekaligus.

## Dokumentasi (`panduan/`)

Semua panduan dipisah per kategori di folder **`panduan/`**:

| File | Isi |
|---|---|
| `panduan/00_DAFTAR_ISI.txt` | Daftar isi semua panduan |
| `panduan/01_MENJALANKAN_Lokal.txt` | Menjalankan lokal (Docker + backend :5000 + frontend :5173) |
| `panduan/02_MENJALANKAN_Online.txt` | Menjalankan online (bat file, tunnel, domain publik) |
| `panduan/03_DATABASE_Prisma.txt` | Koneksi DB, `prisma db push`, seed, reset total |
| `panduan/04_TESTING_Otomatis.txt` | Menjalankan 58 test otomatis (Vitest + Supertest) |
| `panduan/05_DEBUGGING_Troubleshooting.txt` | Semua error & solusinya (PowerShell, port, DB, tunnel) |
| `panduan/06_DEPLOYMENT_Gratis_24-7.txt` | Hosting permanen gratis (Neon + Render + Vercel) |
| `panduan/07_AKUN_DEMO_dan_URL.txt` | Akun demo, URL penting, API key IoT, endpoint demo |
| `panduan/08_STRUKTUR_Project.txt` | Struktur folder, teknologi, alur request, daftar fitur |
| `panduan/09_CHEATSHEET_Perintah.txt` | Perintah cepat siap copy-paste |

## Future Development

PDF laporan & surat peminjaman, email notifikasi, deteksi anomali sensor, MQTT, Web Push, predictive maintenance, multi-lab, mobile app.

---

*Proyek pengembangan sebagai portfolio studi kasus manajemen laboratorium IoT.*