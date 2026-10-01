import { Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service';
import { createTicketSchema, replyTicketSchema, updateTicketSchema } from '../validators/ticket.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class TicketController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'Admin';
      const result = await TicketService.getAll({
        userId: req.user!.userId,
        isAdmin,
        status: req.query.status as any,
        priority: req.query.priority as any,
        search: req.query.search as string | undefined,
        page: Number(req.query.page),
        limit: Number(req.query.limit)
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'Admin';
      const result = await TicketService.getStats(req.user!.userId, isAdmin);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'Admin';
      const result = await TicketService.getById(req.params.id, req.user!.userId, isAdmin);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createTicketSchema.parse(req.body);
      const result = await TicketService.create(req.user!.userId, validated);
      return sendSuccess(res, result, 'Ticket berhasil dibuat', 201);
    } catch (err) {
      next(err);
    }
  }

  static async reply(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = replyTicketSchema.parse(req.body);
      const isAdmin = req.user!.role === 'Admin';
      const result = await TicketService.reply(
        req.params.id,
        req.user!.userId,
        isAdmin,
        validated.message
      );
      return sendSuccess(res, result, 'Balasan berhasil dikirim', 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateTicketSchema.parse(req.body);
      const result = await TicketService.updateStatus(req.params.id, req.user!.userId, validated);
      return sendSuccess(res, result, 'Ticket berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  }

  static async close(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'Admin';
      const result = await TicketService.closeOwn(req.params.id, req.user!.userId, isAdmin);
      return sendSuccess(res, result, 'Ticket ditutup');
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'Admin';
      const result = await TicketService.remove(req.params.id, req.user!.userId, isAdmin);
      return sendSuccess(res, result, 'Ticket berhasil dihapus');
    } catch (err) {
      next(err);
    }
  }
}
