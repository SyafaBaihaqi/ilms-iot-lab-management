import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class NotificationController {
  static async getMine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await NotificationService.getUserNotifications(req.user!.userId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await NotificationService.markAsRead(req.params.id, req.user!.userId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await NotificationService.markAllAsRead(req.user!.userId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}