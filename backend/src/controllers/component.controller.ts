import { Request, Response, NextFunction } from 'express';
import { ComponentService } from '../services/component.service';
import { createComponentSchema, updateComponentSchema, adjustStockSchema } from '../validators/component.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class ComponentController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ComponentService.getAll({
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        condition: req.query.condition as any,
        status: req.query.status as any,
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        sortBy: req.query.sortBy as string
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ComponentService.getById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createComponentSchema.parse(req.body);
      const result = await ComponentService.create(validated);
      return sendSuccess(res, result, 'Component created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateComponentSchema.parse(req.body);
      const result = await ComponentService.update(req.params.id, validated);
      return sendSuccess(res, result, 'Component updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ComponentService.softDelete(req.params.id);
      return sendSuccess(res, null, 'Component deactivated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = adjustStockSchema.parse(req.body);
      const result = await ComponentService.adjustStock(
        req.params.id,
        req.user!.userId,
        validated.quantity,
        validated.transactionType,
        validated.notes
      );
      return sendSuccess(res, result, 'Stock adjusted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getStockHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ComponentService.getStockHistory(
        req.params.id,
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}