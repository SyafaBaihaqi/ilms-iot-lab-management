import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { z } from 'zod';

const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  phone: z.string().optional(),
  roleName: z.enum(['Admin', 'User'])
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
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

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createUserSchema.parse(req.body);
      const result = await UserService.create(validated);
      return sendSuccess(res, result, 'User created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateUserSchema.parse(req.body);
      const result = await UserService.update(req.params.id, validated);
      return sendSuccess(res, result, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await UserService.softDelete(req.params.id);
      return sendSuccess(res, null, 'User deactivated successfully');
    } catch (err) {
      next(err);
    }
  }
}