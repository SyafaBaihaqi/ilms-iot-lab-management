import { Request, Response, NextFunction } from 'express';
import { ReportService, ReportFilters, ReportType } from '../services/report.service';
import { buildCsv, buildExcelBuffer } from '../services/export.service';
import { buildReportPdf } from '../services/pdf.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const slugDate = () => new Date().toISOString().slice(0, 10);

const readFilters = (req: Request): ReportFilters => ({
  from: req.query.from as string | undefined,
  to: req.query.to as string | undefined,
  status: req.query.status as string | undefined
});

const sendReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  type: ReportType,
  fileBase: string
) => {
  try {
    const filters = readFilters(req);
    const format = String(req.query.format || 'json').toLowerCase();

    if (format === 'json') {
      return sendSuccess(res, await ReportService.buildReport(type, filters));
    }

    const rows = await ReportService.getRows(type, filters);
    const columns = ReportService.getColumns(type);
    const filename = `${fileBase}-${slugDate()}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(buildCsv(columns, rows));
    }

    if (format === 'xlsx' || format === 'excel') {
      const summary = (await ReportService.buildReport(type, filters)).summary;
      const buffer = await buildExcelBuffer(type, columns, rows, summary, filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const { summary } = await ReportService.buildReport(type, filters);
      const buffer = await buildReportPdf({
        type,
        columns,
        rows,
        summary,
        filters,
        generatedBy: req.user?.fullName
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    return res.status(400).json({ success: false, error: `Format "${format}" tidak didukung`, code: 'VALIDATION_ERROR' });
  } catch (err) {
    next(err);
  }
};

export class ReportController {
  static inventory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return sendReport(req, res, next, 'inventory', 'laporan-inventaris');
  }

  static borrowing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return sendReport(req, res, next, 'borrowing', 'laporan-peminjaman');
  }

  static damage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return sendReport(req, res, next, 'damage', 'laporan-kerusakan');
  }

  static iot(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return sendReport(req, res, next, 'iot', 'laporan-iot');
  }
}