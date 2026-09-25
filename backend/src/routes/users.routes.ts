import { Router } from 'express';
import { getMe, updateMe, searchUsers, getUserById } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.get('/', searchUsers);
router.get('/:userId', getUserById);

export default router;
