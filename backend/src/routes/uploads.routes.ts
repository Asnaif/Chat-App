import { Router } from 'express';
import { getUploadSignature } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/sign', getUploadSignature);

export default router;
