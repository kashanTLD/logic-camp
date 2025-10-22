import { Router } from 'express';
import { getUsers, createUser, deleteUser, activateUser } from '../../controllers/userController';
import { authenticate, authorize } from '../../middleware/auth';

const router: Router = Router();

// All routes here require admin authentication
router.use(authenticate, authorize(['admin']));

// Admin-only user management routes
router.get('/', getUsers);
router.post('/', createUser);
router.delete('/:id', deleteUser);
router.put('/:id/activate', activateUser);

export default router;
