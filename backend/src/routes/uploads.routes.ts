import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getUploadSignature, uploadDirect, uploadMiddleware, uploadFile } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure Multer Disk Storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

router.use(authenticate);

router.post('/', uploadMiddleware.single('file'), uploadFile);
router.post('/sign', getUploadSignature);
router.post('/file', upload.single('file'), uploadDirect);
router.post('/', upload.single('file'), uploadDirect);

export default router;
