import { Router } from 'express';
import {
  createGroup,
  getGroups,
  getGroupDetails,
  addMembers,
  removeMember,
  updateGroup,
} from '../controllers/group.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getGroups);
router.post('/', createGroup);
router.get('/:groupId', getGroupDetails);
router.patch('/:groupId', updateGroup);
router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/:userId', removeMember);

export default router;
