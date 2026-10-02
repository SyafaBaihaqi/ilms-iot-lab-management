import { z } from 'zod';
import { ALL_ROLES, ROLE_MAHASISWA } from '../constants/roles';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

/**
 * NIM/NIDN: opsional (boleh tidak diisi atau dikosongkan jadi null),
 * maksimal 20 karakter sesuai kolom users.nim.
 * .nullish() dipakai karena frontend mengirim null saat NIM dikosongkan.
 */
export const nimSchema = z
  .string()
  .trim()
  .min(1, 'NIM cannot be empty')
  .max(20, 'NIM must be at most 20 characters')
  .regex(/^[0-9A-Za-z.\-/]+$/, 'NIM may only contain letters, numbers, dot, dash, and slash')
  .nullish();

/**
 * Nama role divalidasi terhadap daftar di constants/roles.ts, lalu dicek
 * lagi ke tabel `roles` di service. Jadi menambah role cukup di satu tempat.
 */
export const roleNameSchema = z.enum(ALL_ROLES, {
  errorMap: () => ({ message: `Role must be one of: ${ALL_ROLES.join(', ')}` })
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  nim: nimSchema,
  phone: z.string().optional(),
  roleName: roleNameSchema.default(ROLE_MAHASISWA)
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});
