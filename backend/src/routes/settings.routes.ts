import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getBlockedUsers,
  blockUser,
  unblockUser,
} from '../controllers/setting.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.patch('/', updateSettings);
router.get('/blocked', getBlockedUsers);
router.post('/blocked', blockUser);
router.delete('/blocked/:userId', unblockUser);

export default router;
