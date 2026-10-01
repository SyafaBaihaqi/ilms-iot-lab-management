import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);

  if (err instanceof ZodError) {
    return sendError(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    );
  }

  // Prisma Known Request Error
  if (err.code === 'P2002') {
    return sendError(
      res,
      'A unique constraint would be violated on one of the fields',
      409,
      'DUPLICATE_RESOURCE',
      err.meta
    );
  }

  if (err.code === 'P2025') {
    return sendError(res, 'Record not found', 404, 'RECORD_NOT_FOUND', err.meta);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, message, statusCode, err.code || 'INTERNAL_ERROR');
};

export const notFoundHandler = (req: Request, res: Response) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND');
};
