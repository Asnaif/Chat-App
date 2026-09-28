import { Request, Response, NextFunction } from 'express';
import cloudinary from '../config/cloudinary';
import { ENV } from '../config/env';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

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

export const uploadDirect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded', 'FILE_MISSING');
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    sendSuccess({
      res,
      statusCode: 201,
      message: 'File uploaded successfully',
      data: {
        storageUrl: fileUrl,
        name: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};

