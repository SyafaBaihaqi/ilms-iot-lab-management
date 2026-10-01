# ANALISIS BLUEPRINT & PRODUCTION READINESS
# IoT Lab Management System (ILMS)

**Dokumen Referensi:** `D:\Study\Prototype\ILMS\ILMS_Blueprint.md`  
**Versi Analisis:** 1.0  
**Tanggal:** 18 September 2026  
**Status:** Analysis & Production Readiness Plan  

---

## DAFTAR ISI

1. Executive Summary & Penilaian Dokumen
2. Analisis Arsitektur & Komponen Teknis
   - Database & Data Model
   - Keamanan & Autentikasi
   - IoT & PWA Architecture
3. Analisis Kesiapan Tahap Produksi (Production Readiness)
   - Strategi Hosting & Provider
   - Gap Kritis & Tantangan Operasional Produksi
4. Checklist Kesiapan Produksi (Production Deployment Checklist)
5. Rekomendasi Langkah Eksekusi

---

## 1. EXECUTIVE SUMMARY & PENILAIAN DOKUMEN

Dokumen blueprint ILMS ini tergolong **sangat matang, terstruktur, dan konsisten**.

* **Keunggulan Utama:** Pemetaan 1:1 yang sangat jelas antara *Functional Requirements*, *Modul Aplikasi*, *Struktur Database (ERD/DDL)*, *REST API Endpoints*, hingga *Diagram UML*.
* **Pendekatan Moduler:** Strategi rilis bertahap (`MVP → Portfolio+ → IoT Dasar → IoT Lanjutan`) sangat tepat untuk mencegah *overengineering* dan memastikan sistem fungsional terlebih dahulu sebelum masuk ke integrasi hardware fisik.
* **Tujuan Ganda (Operasional & Portfolio):** Penataan arsitektur dan penulisan dokumentasi memenuhi standar portfolio-grade yang komprehensif.

---

## 2. ANALISIS ARSITEKTUR & KOMPONEN TEKNIS

### 2.1 Database & Data Model
* **Kelebihan:** 
  * Menggunakan **Soft Delete** (`deleted_at`) pada entitas utama (`users`, `components`, `devices`) untuk menjaga integritas data historis peminjaman dan log.
  * Audit trail (`component_stock_history`, `sensor_readings`, `audit_logs`) bersifat **Append-Only** (insert-only), menjamin transparansi perubahan stok dan data sensor.
  * Penggunaan **Constraint DB** (`CHECK stock_available <= stock_total`) pada PostgreSQL langsung menjaga integritas data di layer terbawah.

### 2.2 Keamanan & Autentikasi
* **Pemisahan Jalur Auth (Web vs IoT):**
  * **Web Client:** Menggunakan **JWT (Bearer Token)** berbasis role (Admin vs User).
  * **IoT Device (ESP32):** Menggunakan **API Key unik per-device** yang disimpan dalam bentuk *hash* (`api_key_hash`). Hal ini sangat krusial agar jika 1 ESP32 diretas/dicuri, kredensial pengguna web maupun device lain tetap aman.

### 2.3 IoT & PWA Architecture
* **IoT REST vs MQTT:** Menggunakan HTTP REST JSON sangat menyederhanakan arsitektur awal tanpa perlu mengelola MQTT Broker terpisah.
* **PWA Caching Strategy:** Kombinasi `CacheFirst` (statik) + `NetworkFirst` (API Data) memungkinkan aplikasi web tetap dapat diakses dalam kondisi koneksi laboratorium yang tidak stabil (offline-capable read-only).

---

## 3. ANALISIS KESIAPAN TAHAP PRODUKSI (PRODUCTION READINESS)

Meskipun blueprint ini dirancang dengan sangat baik, ada beberapa **aspek kritis operasional tahap produksi** yang perlu disiapkan agar sistem dapat berjalan stabil di lingkungan production nyata.

### 3.1 Strategi Hosting & Infrastructure

| Komponen | Opsi Staging / Demo Gratis | Opsi Production Ideal | Catatan Produksi |
|---|---|---|---|
| **Frontend (PWA)** | Vercel / Netlify | Vercel / Netlify | Otomatis CDN global & HTTPS SSL gratis. |
| **Backend API** | Render / Railway (Free Tier) | Render ($7/bulan) / Koyeb / VPS | **Isu Cold-Start:** Render Free Tier akan *sleep* jika menganggur 15 menit. Heartbeat ESP32 bisa terganggu. Untuk produksi, disarankan instance *always-on* atau menambahkan *keep-alive pinger*. |
| **Database** | Supabase / Neon (Free Tier Postgres) | Supabase / Neon / Managed Postgres | Gunakan **PgBouncer** / Connection Pooling untuk menghemat limit koneksi Postgres. |
| **Media Storage (Foto Component/User)** | Cloudinary / Supabase Storage | Cloudinary / AWS S3 / Supabase Storage | **Penting:** Hosting PaaS seperti Render bersifat *ephemeral disk* (file lokal akan hilang saat restart server). Foto **wajib** disimpan di Cloud Object Storage. |

---

### 3.2 Gap Kritis & Tantangan Operasional Produksi

1. **Database Connection Pooling (Prisma + Supabase/Neon):**
   * *Masalah:* Aplikasi Express/Node.js + Prisma serverless/PaaS dapat dengan cepat membuang koneksi DB (terutama saat banyak request heartbeat ESP32 bersamaan).
   * *Solusi Produksi:* Konfigurasi Prisma dengan `accelerate` atau gunakan URL PgBouncer Supabase (`port 6543`) di `DATABASE_URL`.

2. **Pertumbuhan Data Sensor (`sensor_readings` Table Bloat):**
   * *Masalah:* Jika 5 ESP32 mengirim data sensor setiap 10 detik, akan ada **~43.200 baris data per hari**. Database gratis akan cepat penuh.
   * *Solusi Produksi:*
     * Atur interval pengiriman data ESP32 (misal: tiap 1–5 menit, bukan tiap beberapa detik).
     * Buat **Data Retention Policy** / Cron Job penghapusan/agregasi data sensor tua yang berusia > 30 hari.

3. **Background Job Execution (Device Offline & Overdue Checker):**
   * *Masalah:* Menggunakan `setInterval()` biasa di Node.js server tidak stabil jika server di-restart atau di-scale menjadi multi-instance.
   * *Solusi Produksi:* Gunakan **Cron Job Eksternal** (seperti Vercel Cron, GitHub Actions Scheduled Workflow, atau service cron sederhana) yang memanggil endpoint internal API `/api/jobs/check-device-status` dengan secret token.

4. **Penanganan Token JWT (Refresh Token & Expiration):**
   * *Masalah:* Blueprint baru menyebutkan Access Token JWT.
   * *Solusi Produksi:* Terapkan **Access Token (short-lived, misal 15-60 menit)** + **Refresh Token (long-lived, misal 7 hari)** agar user tidak perlu login berulang kali, serta memungkinkan admin melakukan revoke token jika terjadi kebocoran.

5. **Rate Limiting & DDoS Protection di Device Endpoints:**
   * *Masalah:* Endpoint `/api/sensors/readings` dan `/api/devices/heartbeat` rentan terkena spam/flooding dari ESP32 yang mengalami *infinite loop error*.
   * *Solusi Produksi:* Terapkan middleware `express-rate-limit` khusus untuk jalur `/api/devices/*` dan `/api/sensors/*` (misal max 60 request/menit per API key/IP).

---

## 4. CHECKLIST KESIAPAN PRODUKSI (PRODUCTION DEPLOYMENT CHECKLIST)

```
[ ] 1. ENVIRONMENT & SECRETS
    ├── Buat file `.env.production` (DATABASE_URL, JWT_SECRET, REFRESH_SECRET, CLOUDINARY_URL, CORS_ORIGIN)
    └── Pastikan tidak ada secret yang ter-commit ke repositori Git.

[ ] 2. DATABASE & MIGRATIONS
    ├── Jalankan `npx prisma migrate deploy` di server produksi.
    ├── Jalankan `npx prisma db seed` untuk memasukkan roles & kategori awal.
    └── Aktifkan PgBouncer/Connection Pooling pada URL PostgreSQL.

[ ] 3. MEDIA STORAGE INTEGRATION
    ├── Hubungkan endpoint upload foto komponen/user ke Cloudinary atau Supabase Storage.
    └── Simpan URL publik CDN di field `photo_url`.

[ ] 4. SECURITY & NETWORK
    ├── Enforce HTTPS pada seluruh domain Backend & Frontend.
    ├── Set CORS Origin backend secara spesifik hanya ke domain frontend produksi (e.g. `https://ilms-lab.vercel.app`).
    ├── Pasang HTTP Header Protection (Helmet JS di Express).
    └── Terapkan Rate Limiting pada API login dan IoT endpoints.

[ ] 5. IOT HARDWARE HARDENING
    ├── Flash firmware ESP32 dengan URL endpoint produksi (HTTPS).
    ├── Simpan API Key ESP32 di EEPROM / Preferences NVS ESP32.
    └── Terapkan retry mechanism + exponential backoff pada WiFiClient ESP32 jika koneksi terputus.

[ ] 6. BACKGROUND JOBS & MONITORING
    ├── Konfigurasi Cron Scheduler eksternal untuk deteksi Device Offline & Overdue Loans.
    └── Siapkan logging bawaan (Winston/Pino) untuk mencatat error runtime API.
```

---

## 5. REKOMENDASI LANGKAH EKSEKUSI

1. **Fase MVP (Tahap 1–7 Roadmap Blueprint):** Selesaikan core web + DB + PWA terlebih dahulu di lokal.
2. **Fase Cloud Staging (Tahap 8–9 Roadmap Blueprint):** Deploy Frontend (Vercel) & Backend + DB (Render + Supabase), integrasikan Cloud Object Storage untuk foto.
3. **Fase IoT Integration (Tahap 10–11 Roadmap Blueprint):** Hubungkan ESP32 fisik ke endpoint HTTPS staging/production.
4. **Fase Hardening Produksi (Tahap 12 Roadmap Blueprint):** Terapkan rate limiting, cron job eksternal, dan retention policy data sensor.
