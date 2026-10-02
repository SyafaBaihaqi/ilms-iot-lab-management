/**
 * Definisi peran aplikasi, cerminan backend/src/constants/roles.ts.
 *
 * - Admin     : akses penuh, termasuk Manajemen Pengguna dan Log Audit
 * - Dosen     : Admin tanpa Manajemen Pengguna dan Log Audit
 * - Mahasiswa : peminjam komponen dan tiket sendiri
 * - User      : alias umum, setara Mahasiswa (akun lama)
 */

export const ROLE_ADMIN = 'Admin';
export const ROLE_DOSEN = 'Dosen';
export const ROLE_MAHASISWA = 'Mahasiswa';
export const ROLE_USER = 'User';

export const ALL_ROLES = [ROLE_ADMIN, ROLE_DOSEN, ROLE_MAHASISWA, ROLE_USER] as const;

export type RoleName = (typeof ALL_ROLES)[number];

export const STAFF_ROLES: RoleName[] = [ROLE_ADMIN, ROLE_DOSEN];
export const STUDENT_ROLES: RoleName[] = [ROLE_MAHASISWA, ROLE_USER];

export const isAdminRole = (role?: string | null): boolean => role === ROLE_ADMIN;

export const isStaffRole = (role?: string | null): boolean =>
  !!role && (STAFF_ROLES as string[]).includes(role);

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

/** Opsi untuk dropdown role di form pengguna. */
export const ROLE_OPTIONS: { value: RoleName; label: string }[] = [
  { value: ROLE_ADMIN, label: 'Admin' },
  { value: ROLE_DOSEN, label: 'Dosen' },
  { value: ROLE_MAHASISWA, label: 'Mahasiswa' },
  { value: ROLE_USER, label: 'User (umum)' }
];