import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getBlockedUsers,
  blockUser,
  unblockUser,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  changePassword,
} from '../controllers/setting.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Settings
router.get('/', getSettings);
router.patch('/', updateSettings);

// Blocked users
router.get('/blocked', getBlockedUsers);
router.post('/blocked', blockUser);
router.delete('/blocked/:userId', unblockUser);

// Sessions & Security
router.get('/sessions', getSessions);
router.delete('/sessions/:sessionId', revokeSession);
router.post('/sessions/logout-all', revokeAllOtherSessions);
router.post('/security/change-password', changePassword);

export default router;
