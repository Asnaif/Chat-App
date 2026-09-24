import { Request, Response, NextFunction } from 'express';
import cloudinary from '../config/cloudinary';
import { ENV } from '../config/env';
import { sendSuccess } from '../utils/apiResponse';

export const getUploadSignature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = req.body.folder || 'chat_app_uploads';

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      ENV.CLOUDINARY_API_SECRET
    );

    sendSuccess({
      res,
      data: {
        signature,
        timestamp,
        folder,
        cloudName: ENV.CLOUDINARY_CLOUD_NAME,
        apiKey: ENV.CLOUDINARY_API_KEY,
      },
    });
  } catch (error) {
    next(error);
  }
};
