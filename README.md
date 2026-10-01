# IoT Lab Management System (ILMS)

Sistem manajemen laboratorium IoT berbasis web: manajemen inventaris komponen, peminjaman-pengembalian, audit stok, perangkat IoT (ESP32), serta monitoring data sensor. Dibangun modular: **MVP → Portfolio+ → IoT Dasar → IoT Lanjutan**.

## Fitur

- Autentikasi & RBAC (Admin / User) dengan JWT + Refresh Token
- Manajemen komponen, kategori, stok real-time, dan riwayat stok
- Alur peminjaman-pengembalian (ajukan → approve/reject → return) yang dibungkus transaksi database
- Dashboard statistik admin
- Laporan inventaris/peminjaman/kerusakan/IoT dengan ekspor CSV
- PWA: installable + offline shell (service worker via vite-plugin-pwa)
- Integrasi ESP32: registrasi, heartbeat, dan pengiriman data sensor via API key khusus
- Notifikasi in-app, audit log, deteksi device offline, penandaan peminjaman overdue

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
| User | `mahasiswa1` | `user123` |
| User | `user` | `user123` |

Login menerima **username, NIM, email, atau nomor HP** (field login berlabel `Username / NIM / Email / No. HP`).

## API Ringkas

| Endpoint | Auth | Deskripsi |
|---|---|---|
| `POST /api/auth/login` | Public | Login → access + refresh token |
| `POST /api/devices/register` | Public+Secret | ESP32 mendaftar, mendapat API key |
| `POST /api/devices/heartbeat` | API Key | ESP32 memberi tanda online |
| `POST /api/sensors/readings/batch` | API Key | ESP32 mengirim data sensor |
| `GET /api/dashboard/summary` | JWT Admin | Statistik dashboard |
| ... | | (Lengkap ada di `docs/API.md`) |

## Testing

```bash
cd backend && npm test          # (unit/existing integration examples)
```

## Deployment (Production)

Paket **gratis** (Neon + Render + Vercel + GitHub Actions keep-alive), jalur VPS murah, dan
troubleshooting ada di **`docs/DEPLOYMENT.md`**. Domain produksi: `ilms.saiasyap.my.id`.

Untuk demo lokal tanpa hosting: double-click `mulai-online.bat`
(atau ikuti `Panduan_Online_Cepat.txt`) — menjalankan PostgreSQL, backend, server frontend,
dan Cloudflare Tunnel sekaligus.

## Future Development

MQTT, Web Push, QR Code, predictive maintenance, multi-lab, mobile app.

---

*Proyek pengembangan sebagai portfolio studi kasus manajemen laboratorium IoT.*