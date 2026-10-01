import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { auditQuerySchema } from '../validators/audit.validator';
import { sendSuccess, sendError } from '../utils/response';

export class AuditController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = auditQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return sendError(res, 'Invalid audit log query', 400, 'VALIDATION_ERROR', parsed.error.flatten());
      }

      const result = await AuditService.getAll(parsed.data);
      return sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  static async getFacets(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuditService.getFacets();
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuditService.getById(req.params.id);
      if (!result) return sendError(res, 'Audit log not found', 404, 'AUDIT_LOG_NOT_FOUND');
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
