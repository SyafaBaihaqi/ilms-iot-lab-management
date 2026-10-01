import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import { sendSuccess } from '../utils/response';
import { auditRequest } from '../utils/audit';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class CategoryController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CategoryService.getAll();
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CategoryService.getById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createCategorySchema.parse(req.body);
      const result = await CategoryService.create(validated);
      await auditRequest(req, 'category.create', 'Category', result.id, { name: validated.name });
      return sendSuccess(res, result, 'Category created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateCategorySchema.parse(req.body);
      const result = await CategoryService.update(req.params.id, validated);
      await auditRequest(req, 'category.update', 'Category', req.params.id);
      return sendSuccess(res, result, 'Category updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await CategoryService.delete(req.params.id);
      await auditRequest(req, 'category.delete', 'Category', req.params.id);
      return sendSuccess(res, null, 'Category deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
