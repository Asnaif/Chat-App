import { Router } from 'express';
import { getUploadSignature, uploadFile, uploadMiddleware } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', uploadMiddleware.single('file'), uploadFile);
router.post('/sign', getUploadSignature);

export default router;
