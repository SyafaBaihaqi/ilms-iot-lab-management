import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DashboardService.getSummary();
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}