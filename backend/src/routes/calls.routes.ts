import { Router } from 'express';
import { getCallHistory, createCallLog } from '../controllers/call.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getCallHistory);
router.post('/', createCallLog);

export default router;
