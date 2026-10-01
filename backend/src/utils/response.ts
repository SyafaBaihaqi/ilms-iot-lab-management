import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, any>;
  error?: string;
  code?: string;
  details?: any;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: Record<string, any>
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
};

export const sendError = (
  res: Response,
  error: string,
  statusCode = 400,
  code?: string,
  details?: any
) => {
  return res.status(statusCode).json({
    success: false,
    error,
    code,
    details
  });
};
