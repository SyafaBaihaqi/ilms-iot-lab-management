# ILMS API Documentation

Base URL: `/api`
Format: JSON
Auth Web: `Authorization: Bearer <JWT>`
Auth Device: `X-API-Key: <device_api_key>`

## Konvensi Response

```json
{ "success": true, "message": "...", "data": {}, "meta": {} }
{ "success": false, "error": "...", "code": "...", "details": {} }
```

## 1. Authentication

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login → `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh` | Public | `{ refreshToken }` → `{ accessToken }` |
| POST | `/api/auth/logout` | Public | Logout (client-side token discard) |
| GET | `/api/auth/me` | JWT | Profil user login |
| PUT | `/api/auth/change-password` | JWT | Ganti password `{ oldPassword, newPassword }` |
| POST | `/api/auth/register` | JWT Admin | Buat user baru |

## 2. Users (Admin)

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/users?search=&page=&limit=` | List user (kolom respons memuat `nim`) |
| POST | `/api/users` | Buat user `{ fullName, email, username, password, nim?, phone?, roleName }` |
| PUT | `/api/users/:id` | Update, termasuk `password` (opsional), `nim`, `roleName` |
| DELETE | `/api/users/:id` | Soft delete / nonaktifkan |

Field `nim` (NIM/NIDN):

| Aturan | Nilai |
|---|---|
| Wajib | Tidak (boleh `null` / tidak dikirim) |
| Panjang | Maksimal 20 karakter |
| Karakter | Huruf, angka, titik, `-`, `/` |
| Unik | Ya (duplikat → `409 USER_EXISTS`) |
| Fungsi | Bisa dipakai sebagai identifier saat login |

`GET /api/users?search=` mencari di `fullName`, `username`, `email`, **dan** `nim`.

Contoh:

```json
POST /api/users
{
  "fullName": "Budi Santoso",
  "email": "budi@student.test",
  "username": "budi",
  "password": "budi12345",
  "nim": "2210999",
  "phone": "081200000001",
  "roleName": "User"
}
```

```json
PUT /api/users/:id
{ "nim": null }        // kosongkan NIM
```

## 3. Categories

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/categories` | JWT | List + jumlah komponen |
| GET | `/api/categories/:id` | JWT | Detail |
| POST | `/api/categories` | JWT Admin | Tambah |
| PUT | `/api/categories/:id` | JWT Admin | Update |
| DELETE | `/api/categories/:id` | JWT Admin | Hapus (ditolak jika masih dipakai) |

## 4. Components

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/components?search=&category=&condition=&status=&sortBy=&page=&limit=` | JWT | List + filter. `sortBy`: `name_asc` \| `name_desc` \| `category_asc` \| `category_desc` \| `stock_asc` \| `stock_desc` \| `createdAt_asc` \| `createdAt_desc` (default) |
| GET | `/api/components/:id` | JWT | Detail + 10 riwayat stok terakhir |
| POST | `/api/components` | JWT Admin | Tambah (stokAvailable = stockTotal) |
| PUT | `/api/components/:id` | JWT Admin | Update |
| DELETE | `/api/components/:id` | JWT Admin | Soft delete |
| POST | `/api/components/:id/adjust-stock` | JWT Admin | `{ quantity, transactionType, notes? }` |
| GET | `/api/components/:id/history` | JWT Admin | Riwayat perubahan stok |

## 5. Loans

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/loans?status=&page=&limit=` | JWT | Admin: semua; User: milik sendiri |
| GET | `/api/loans/:id` | JWT | Detail (scoped) |
| POST | `/api/loans` | JWT | `{ dueDate, notes?, items: [{ componentId, quantity }] }` |
| PUT | `/api/loans/:id/approve` | JWT Admin | Setujui + kurangi stok atomik |
| PUT | `/api/loans/:id/reject` | JWT Admin | Tolak `{ reason? }` |
| PUT | `/api/loans/:id/return` | JWT Admin | `{ items: [{ loanDetailId, conditionAfter, damageNotes? }] }` |
| PUT | `/api/loans/:id/cancel` | JWT User | Batalkan hanya status Pending |

## 6. Devices (IoT)

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/devices/register` | Public | `{ esp32Id, deviceName, deviceType, firmwareVersion?, location? }` → `{ deviceId, apiKey }` (sekali) |
| POST | `/api/devices/heartbeat` | API Key | Update last_seen + status Online |
| GET | `/api/devices/:id/config` | API Key | Konfigurasi device |
| GET | `/api/devices` | JWT Admin | List device |
| POST | `/api/devices` | JWT Admin | Tambah manual |
| GET | `/api/devices/:id` | JWT Admin | Detail |
| PUT | `/api/devices/:id` | JWT Admin | Update |
| DELETE | `/api/devices/:id` | JWT Admin | Hapus |

## 7. Sensors

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/sensors/readings` | API Key | `{ sensorType, value, unit? }` |
| POST | `/api/sensors/readings/batch` | API Key | `{ readings: [...] }` |
| GET | `/api/sensors/readings?deviceId=&sensorType=&limit=` | JWT Admin | List data sensor |
| GET | `/api/sensors/devices/:deviceId/readings/latest` | JWT | Nilai terbaru per jenis |
| GET | `/api/sensors/devices/:deviceId/readings/history?limit=` | JWT | Data historis chart |

## 8. Dashboard & Laporan

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/dashboard/summary` | JWT Admin | Statistik kartu dashboard |
| GET | `/api/reports/inventory[?format=csv]` | JWT Admin | Laporan inventaris |
| GET | `/api/reports/borrowing[?from=&to=&format=csv]` | JWT Admin | Laporan peminjaman |
| GET | `/api/reports/damage[?format=csv]` | JWT Admin | Laporan kerusakan |
| GET | `/api/reports/iot[?format=csv]` | JWT Admin | Laporan device IoT |

## 9. Notifications

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/notifications` | JWT | Notifikasi user login |
| PUT | `/api/notifications/:id/read` | JWT | Tandai dibaca |
| PUT | `/api/notifications/read-all` | JWT | Tandai semua dibaca |

## 10. Log Audit

Mencatat jejak perubahan data penting: aktor, aksi, entitas, ID, IP, dan detail perubahan (`metadata`). Dapat difilter dengan `search`, `entityType`, `action`, `userId`, dan rentang tanggal. **Admin only.**

| Endpoint | Auth | Deskripsi |
|---|---|---|
| `GET /api/audit-logs` | JWT Admin | Daftar log audit (paginated, `page`, `limit` max 200) |
| `GET /api/audit-logs/facets` | JWT Admin | Daftar entitas & aksi yang tersedia (untuk filter UI) |
| `GET /api/audit-logs/:id` | JWT Admin | Detail satu log audit |

Parameter query `GET /api/audit-logs`:

| Parameter | Tipe | Keterangan |
|---|---|---|
| `search` | string | Cari di aksi, entitas, ID entitas, atau nama/username aktor |
| `entityType` | string | Contoh: `Component`, `Loan`, `User`, `Device`, `Ticket`, `Category` |
| `action` | string | Contoh: `component.adjust_stock`, `loan.approve` |
| `userId` | uuid | Filter berdasarkan aktor |
| `from` / `to` | ISO date | Rentang waktu aktivitas |

Aksi yang tercatat: `component.create`, `component.update`, `component.delete`, `component.adjust_stock`, `loan.create`, `loan.approve`, `loan.reject`, `loan.return`, `loan.cancel`, `user.create`, `user.update`, `user.delete`, `category.create`, `category.update`, `category.delete`, `device.create`, `device.update`, `device.delete`, `ticket.create`, `ticket.reply`, `ticket.update_status`, `ticket.close`, `ticket.delete`.

Contoh respons:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "action": "component.adjust_stock",
      "entityType": "Component",
      "entityId": "uuid",
      "ipAddress": "103.28.14.5",
      "metadata": { "quantity": 3, "transactionType": "OUT", "notes": "Dipinjam uji coba" },
      "createdAt": "2026-10-01T09:56:19.000Z",
      "user": { "id": "uuid", "username": "admin", "fullName": "Admin", "role": { "name": "Admin" } }
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 25, "totalPages": 1 }
}
```

## 11. QR Code Komponen

| Endpoint | Auth | Deskripsi |
|---|---|---|
| `GET /api/components/:id/qrcode` | JWT Admin/User | QR Code label inventaris (PNG) |
| `GET /api/components/:id/qrcode?format=svg` | JWT Admin/User | Versi SVG (untuk cetak vektor) |

Isi QR berupa URL halaman inventori: `{FRONTEND_URL}/inventory?component={id}`.
Respons berupa file gambar langsung (`Content-Type: image/png`), bukan JSON — gunakan `responseType: 'blob'` di axios.

```ts
const res = await api.get(`/components/${id}/qrcode`, { responseType: 'blob' });
```

| Status | Kode | Keterangan |
|---|---|---|
| 200 | — | File PNG/SVG dikembalikan |
| 401 | `AUTH_REQUIRED` / `TOKEN_INVALID` | Token hilang atau tidak valid |
| 404 | `COMPONENT_NOT_FOUND` | Komponen tidak ada atau nonaktif |

## 12. Customer Service (Tiket)

Base: `/api/tickets` · Status: `Open`, `In Progress`, `Resolved`, `Closed` · Prioritas: `Low`, `Medium`, `High`, `Urgent`

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/tickets` | JWT | Daftar tiket (Admin: semua, User: miliknya). Query: `status`, `priority`, `search`, `page`, `limit` |
| GET | `/api/tickets/stats` | JWT | Jumlah tiket per status |
| GET | `/api/tickets/:id` | JWT | Detail tiket + seluruh percakapan |
| POST | `/api/tickets` | JWT | Buat tiket baru `{ subject, message, priority? }` |
| POST | `/api/tickets/:id/replies` | JWT | Balas tiket `{ message }` (balasan admin otomatis mengubah status `Open` → `In Progress`) |
| PUT | `/api/tickets/:id` | JWT Admin | Ubah status/prioritas + auto-assign ke admin yang bertindak |
| PUT | `/api/tickets/:id/close` | JWT | Tutup tiket (pemilik atau admin) |
| DELETE | `/api/tickets/:id` | JWT | Hapus tiket (soft delete; pemilik atau admin) |

Setiap tiket baru / balasan / perubahan status otomatis membuat notifikasi untuk lawinannya (Admin atau pemilik tiket).

## HTTP Status

`200` OK · `201` Created · `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `409` Conflict · `422` Unprocessable · `429` Rate Limited · `500` Internal Error