import { Router } from 'express';
import { getUsers, getUserById, updateUser } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = Router();

// Manager-level routes (read-only access to user list)
router.get('/', authenticate, authorize(['admin', 'manager']), getUsers);

// Regular user routes (non-admin)
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, updateUser);

export default router;
