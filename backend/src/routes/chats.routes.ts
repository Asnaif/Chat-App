import { Router } from 'express';
import {
  getChats,
  createOrGetDirectChat,
  getChatMessages,
  createMessage,
  markChatAsRead,
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getChats);
router.post('/', createOrGetDirectChat);
router.get('/:chatId/messages', getChatMessages);
router.post('/:chatId/messages', createMessage);
router.post('/:chatId/read', markChatAsRead);

export default router;
