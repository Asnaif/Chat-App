import { Router } from 'express';
import {
  toggleStarMessage,
  getStarredMessages,
  editMessage,
  deleteMessage,
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/starred', getStarredMessages);
router.post('/:messageId/star', toggleStarMessage);
router.patch('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);

export default router;
