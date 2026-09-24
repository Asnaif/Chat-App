import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';

export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const missing: string[] = [];
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      const fieldErrors: Record<string, string> = {};
      missing.forEach((f) => (fieldErrors[f] = `${f} is required`));
      throw new ApiError(400, `Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR', fieldErrors);
    }

    next();
  };
};
