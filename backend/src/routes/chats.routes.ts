import { Router } from 'express';
import {
  getChats,
  createOrGetDirectChat,
  getChatMessages,
  createMessage,
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getChats);
router.post('/', createOrGetDirectChat);
router.get('/:chatId/messages', getChatMessages);
router.post('/:chatId/messages', createMessage);

export default router;
