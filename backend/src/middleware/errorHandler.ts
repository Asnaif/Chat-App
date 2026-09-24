import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const code = err instanceof ApiError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Something went wrong';
  const fields = err instanceof ApiError ? err.fields : undefined;

  if (process.env.NODE_ENV !== 'production' && !(err instanceof ApiError)) {
    console.error('[Error Details]:', err);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  });
};
