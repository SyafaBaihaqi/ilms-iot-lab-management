import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { sendSuccess } from '../utils/response';

export class ReportController {
  static async inventory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getInventoryReport();
      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
        return res.send(ReportService.toCSV(data));
      }
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async borrowing(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getBorrowingReport(
        req.query.from as string | undefined,
        req.query.to as string | undefined
      );
      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="borrowing-report.csv"');
        return res.send(ReportService.toCSV(data));
      }
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async damage(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getDamageReport();
      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="damage-report.csv"');
        return res.send(ReportService.toCSV(data));
      }
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async iot(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getIoTReport();
      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="iot-report.csv"');
        return res.send(ReportService.toCSV(data));
      }
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}