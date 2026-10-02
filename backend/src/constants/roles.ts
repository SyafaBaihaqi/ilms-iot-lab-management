/**
 * Definisi peran aplikasi.
 *
 * Tabel `roles` di database bersifat dinamis, tetapi hak akses di kode
 * harus eksplisit. Semua nama role yang dikenali dikumpulkan di sini supaya
 * satu tempat yang perlu diubah kalau menambah role baru.
 *
 * Pemisahan hak akses:
 * - Admin    : akses penuh, termasuk Manajemen Pengguna dan Log Audit
 * - Dosen    : Admin tanpa Manajemen Pengguna dan Log Audit
 * - Mahasiswa: peminjam komponen, tiket miliknya sendiri
 * - User     : alias umum untukrole non-spesifik di atas, punya hak
 *              akses setara Mahasiswa. Dipertahankan supaya akun lama
 *              tidak ikut kehilangan akses.
 */

export const ROLE_ADMIN = 'Admin';
export const ROLE_DOSEN = 'Dosen';
export const ROLE_MAHASISWA = 'Mahasiswa';
export const ROLE_USER = 'User';

export const ALL_ROLES = [ROLE_ADMIN, ROLE_DOSEN, ROLE_MAHASISWA, ROLE_USER] as const;

export type RoleName = (typeof ALL_ROLES)[number];

/** Peran yang boleh mengelola data laboratorium. */
export const STAFF_ROLES: RoleName[] = [ROLE_ADMIN, ROLE_DOSEN];

/** Peran tingkat mahasiswa. `User` diperlakukan sama dengan `Mahasiswa`. */
export const STUDENT_ROLES: RoleName[] = [ROLE_MAHASISWA, ROLE_USER];

export const isAdminRole = (role?: string | null): boolean => role === ROLE_ADMIN;

export const isStaffRole = (role?: string | null): boolean =>
  !!role && (STAFF_ROLES as string[]).includes(role);

export const isStudentRole = (role?: string | null): boolean =>
  !!role && (STUDENT_ROLES as string[]).includes(role);

export const roleLabel = (role?: string | null): string => {
  switch (role) {
    case ROLE_ADMIN:
      return 'Admin';
    case ROLE_DOSEN:
      return 'Dosen';
    case ROLE_MAHASISWA:
      return 'Mahasiswa';
    case ROLE_USER:
      return 'User';
    default:
      return role || '-';
  }
};