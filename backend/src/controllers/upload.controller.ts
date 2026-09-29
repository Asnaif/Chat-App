import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cloudinary from '../config/cloudinary';
import { ENV } from '../config/env';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

import os from 'os';

// Ensure local uploads directory exists as reliable fallback
const uploadDir = process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch {
  // Ignore if folder creation has permission restrictions
}

// Memory storage for direct buffer stream to Cloudinary or disk
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file provided for upload', 'FILE_REQUIRED');
    }

    const file = req.file;
    const isCloudinaryConfigured = Boolean(
      ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET
    );

    let storageUrl = '';
    let publicId = '';

    if (isCloudinaryConfigured) {
      // Upload via Cloudinary Stream
      const result: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'chat_app_uploads',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      storageUrl = result.secure_url || result.url;
      publicId = result.public_id;
    } else {
      // Fallback: save to local backend uploads directory (/tmp on cloud)
      const ext = path.extname(file.originalname) || '';
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
      const filePath = path.join(uploadDir, uniqueFileName);
      fs.writeFileSync(filePath, file.buffer);

      const host = req.get('host');
      const protocol = req.protocol || 'https';
      storageUrl = `${protocol}://${host}/uploads/${uniqueFileName}`;
      publicId = uniqueFileName;
    }


    sendSuccess({
      res,
      statusCode: 201,
      message: 'File uploaded successfully',
      data: {
        storageUrl,
        publicId,
        mimeType: file.mimetype,
        size: file.size,
        name: file.originalname,
      },
    });
  } catch (error) {
    next(error);
  }
};

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

