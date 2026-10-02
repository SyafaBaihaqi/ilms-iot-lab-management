import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { auditRequest } from '../utils/audit';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { z } from 'zod';
import { nimSchema } from '../validators/auth.validator';

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  nim: nimSchema,
  phone: z.string().optional(),
  roleName: z.enum(['Admin', 'User'])
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  nim: nimSchema,
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  roleName: z.enum(['Admin', 'User']).optional(),
  password: z.string().min(6).optional()
});

export class UserController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UserService.getAll({
        search: req.query.search as string,
        page: Number(req.query.page),
        limit: Number(req.query.limit)
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createUserSchema.parse(req.body);
      const result = await UserService.create(validated);
      await auditRequest(req, 'user.create', 'User', result.id, {
        username: validated.username,
        roleName: validated.roleName
      });
      return sendSuccess(res, result, 'User created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateUserSchema.parse(req.body);
      const result = await UserService.update(req.params.id, validated);
      await auditRequest(req, 'user.update', 'User', req.params.id, {
        changes: Object.keys(validated).filter((k) => k !== 'password'),
        passwordChanged: Boolean(validated.password)
      });
      return sendSuccess(res, result, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await UserService.softDelete(req.params.id);
      await auditRequest(req, 'user.delete', 'User', req.params.id);
      return sendSuccess(res, null, 'User deactivated successfully');
    } catch (err) {
      next(err);
    }
  }
}