import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../utils/response';
import { ALL_ROLES, ROLE_ADMIN, STAFF_ROLES } from '../constants/roles';

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};

/** Hanya Admin. Dipakai untuk Manajemen Pengguna dan Log Audit. */
export const requireAdmin = requireRole([ROLE_ADMIN]);

/** Admin atau Dosen. Dipakai untuk seluruh data operasional laboratorium. */
export const requireStaff = requireRole(STAFF_ROLES);

/** Semua role yang dikenali. Dipakai untuk endpoint yang boleh dipakai semua pengguna. */
export const requireAnyRole = requireRole([...ALL_ROLES]);
