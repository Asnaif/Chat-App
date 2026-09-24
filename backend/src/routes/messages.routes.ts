import { Router } from 'express';
import { toggleStarMessage, getStarredMessages } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/starred', getStarredMessages);
router.post('/:messageId/star', toggleStarMessage);

export default router;
