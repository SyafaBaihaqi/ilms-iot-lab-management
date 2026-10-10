import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator';
import { sendSuccess } from '../utils/response';
import { auditRequest } from '../utils/audit';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class ProjectController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProjectService.getAll({
        search: req.query.search as string,
        category: req.query.category as string,
        highlight: req.query.highlight as string,
        student: req.query.student as string
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProjectService.getStats();
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProjectService.getById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = { ...req.body, authorId: req.body.authorId || null };
      const validated = createProjectSchema.parse(body);
      const result = await ProjectService.create(validated, req.user?.userId);
      await auditRequest(req, 'project.create', 'Project', result.id, { title: result.title });
      return sendSuccess(res, result, 'Project created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = { ...req.body };
      if ('authorId' in body) body.authorId = body.authorId || null;
      const validated = updateProjectSchema.parse(body);
      const result = await ProjectService.update(req.params.id, validated);
      await auditRequest(req, 'project.update', 'Project', req.params.id, {
        changes: Object.keys(validated)
      });
      return sendSuccess(res, result, 'Project updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await ProjectService.delete(req.params.id);
      await auditRequest(req, 'project.delete', 'Project', req.params.id);
      return sendSuccess(res, null, 'Project deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
