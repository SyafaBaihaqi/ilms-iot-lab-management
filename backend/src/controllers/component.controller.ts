import { Request, Response, NextFunction } from 'express';
import { ComponentService } from '../services/component.service';
import { createComponentSchema, updateComponentSchema, adjustStockSchema } from '../validators/component.validator';
import { sendSuccess, sendError } from '../utils/response';
import { QrCodeService } from '../services/qrcode.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { auditRequest } from '../utils/audit';

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

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createComponentSchema.parse(req.body);
      const result = await ComponentService.create(validated);
      await auditRequest(req, 'component.create', 'Component', result.id, {
        inventoryCode: validated.inventoryCode,
        name: validated.name,
        stockTotal: validated.stockTotal
      });
      return sendSuccess(res, result, 'Component created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateComponentSchema.parse(req.body);
      const result = await ComponentService.update(req.params.id, validated);
      await auditRequest(req, 'component.update', 'Component', req.params.id, {
        changes: Object.keys(validated)
      });
      return sendSuccess(res, result, 'Component updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await ComponentService.softDelete(req.params.id);
      await auditRequest(req, 'component.delete', 'Component', req.params.id);
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
      await auditRequest(req, 'component.adjust_stock', 'Component', req.params.id, {
        quantity: validated.quantity,
        transactionType: validated.transactionType,
        notes: validated.notes || null
      });
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

  static async getQrCode(req: Request, res: Response, next: NextFunction) {
    try {
      const component = await ComponentService.getById(req.params.id);
      if (!component) return sendError(res, 'Component not found', 404, 'COMPONENT_NOT_FOUND');

      const payload = QrCodeService.buildComponentPayload(component);
      const format = String(req.query.format || 'png').toLowerCase();

      if (format === 'svg') {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(await QrCodeService.toSvg(payload.text));
      }

      const png = await QrCodeService.toPng(payload.text);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="qr-${component.inventoryCode}.png"`
      );
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.send(png);
    } catch (err) {
      next(err);
    }
  }
}