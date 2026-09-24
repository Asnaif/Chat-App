import { Response } from 'express';

export interface ApiResponseOptions<T = any> {
  res: Response;
  statusCode?: number;
  data?: T;
  message?: string;
  meta?: Record<string, any>;
}

export const sendSuccess = <T = any>({
  res,
  statusCode = 200,
  data = {} as T,
  message = 'Success',
  meta,
}: ApiResponseOptions<T>): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    ...(meta ? { meta } : {}),
  });
};
