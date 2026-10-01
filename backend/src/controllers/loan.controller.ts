import { Request, Response, NextFunction } from 'express';
import { LoanService } from '../services/loan.service';
import { createLoanSchema, returnLoanSchema } from '../validators/loan.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class LoanController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'Admin';
      const result = await LoanService.getAll({
        userId: req.user!.userId,
        isAdmin,
        status: req.query.status as any,
        page: Number(req.query.page),
        limit: Number(req.query.limit)
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'Admin';
      const result = await LoanService.getById(req.params.id, req.user!.userId, isAdmin);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createLoanSchema.parse(req.body);
      const result = await LoanService.create(req.user!.userId, validated);
      return sendSuccess(res, result, 'Loan request created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await LoanService.approve(req.params.id, req.user!.userId);
      return sendSuccess(res, result, 'Loan approved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await LoanService.reject(req.params.id, req.user!.userId, req.body?.reason);
      return sendSuccess(res, result, 'Loan rejected successfully');
    } catch (err) {
      next(err);
    }
  }

  static async processReturn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = returnLoanSchema.parse(req.body);
      const result = await LoanService.processReturn(req.params.id, req.user!.userId, validated.items);
      return sendSuccess(res, result, 'Return processed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await LoanService.cancel(req.params.id, req.user!.userId);
      return sendSuccess(res, result, 'Loan cancelled successfully');
    } catch (err) {
      next(err);
    }
  }
}