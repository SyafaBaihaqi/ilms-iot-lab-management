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
| GET | `/api/users?search=&page=&limit=` | List user |
| POST | `/api/users` | Buat user `{ fullName, email, username, password, roleName }` |
| PUT | `/api/users/:id` | Update, termasuk `password` (opsional) & `roleName` |
| DELETE | `/api/users/:id` | Soft delete / nonaktifkan |

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

## 10. Customer Service (Tiket)

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