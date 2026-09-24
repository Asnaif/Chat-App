import { Router } from 'express';
import { createGroup, getGroups, getGroupDetails } from '../controllers/group.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getGroups);
router.post('/', createGroup);
router.get('/:groupId', getGroupDetails);

export default router;
