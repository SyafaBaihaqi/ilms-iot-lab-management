import { Request, Response, NextFunction } from 'express';
import { LoanService } from '../services/loan.service';
import { ReportService } from '../services/report.service';
import { buildLoanLetterPdf } from '../services/pdf.service';
import { createLoanSchema, returnLoanSchema } from '../validators/loan.validator';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { auditRequest } from '../utils/audit';
import { isStaffRole } from '../constants/roles';

export class LoanController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
const isStaff = isStaffRole(req.user!.role);
      const result = await LoanService.getAll({
        userId: req.user!.userId,
        isAdmin: isStaff,
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
      const isStaff = isStaffRole(req.user!.role);
      const result = await LoanService.getById(req.params.id, req.user!.userId, isStaff);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createLoanSchema.parse(req.body);
      const result = await LoanService.create(req.user!.userId, validated);
      await auditRequest(req, 'loan.create', 'Loan', result.id, {
        itemCount: validated.items?.length ?? 0,
        dueDate: validated.dueDate
      });
      return sendSuccess(res, result, 'Loan request created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await LoanService.approve(req.params.id, req.user!.userId);
      await auditRequest(req, 'loan.approve', 'Loan', req.params.id);
      return sendSuccess(res, result, 'Loan approved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await LoanService.reject(req.params.id, req.user!.userId, req.body?.reason);
      await auditRequest(req, 'loan.reject', 'Loan', req.params.id, { reason: req.body?.reason ?? null });
      return sendSuccess(res, result, 'Loan rejected successfully');
    } catch (err) {
      next(err);
    }
  }

  static async processReturn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = returnLoanSchema.parse(req.body);
      const result = await LoanService.processReturn(req.params.id, req.user!.userId, validated.items);
      await auditRequest(req, 'loan.return', 'Loan', req.params.id, {
        returnedItems: validated.items.length
      });
      return sendSuccess(res, result, 'Return processed successfully');
    } catch (err) {
      next(err);
    }
  }

  /** Surat peminjaman PDF; khusus staff. */
  static async letter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!isStaffRole(req.user!.role)) {
        return sendError(res, 'Hanya staff yang dapat membuat surat peminjaman', 403, 'FORBIDDEN');
      }

      const letter = await ReportService.getLoanLetter(req.params.id);
      if (!letter) {
        return sendError(res, 'Peminjaman tidak ditemukan', 404, 'NOT_FOUND');
      }

      if (String(req.query.format || 'json').toLowerCase() === 'pdf') {
        const buffer = await buildLoanLetterPdf(letter);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="surat-peminjaman-${letter.loanCode}.pdf"`
        );
        res.setHeader('Content-Length', buffer.length);
        return res.send(buffer);
      }

      return sendSuccess(res, letter);
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await LoanService.cancel(req.params.id, req.user!.userId);
      await auditRequest(req, 'loan.cancel', 'Loan', req.params.id);
      return sendSuccess(res, result, 'Loan cancelled successfully');
    } catch (err) {
      next(err);
    }
  }
}