import { Router } from 'express';
import { register, login } from '../../controllers/authController';
import { authenticate, authorize } from '../../middleware/auth';

const router: Router = Router();

// Public admin auth routes (no authentication required)
router.post('/login', login);

// Protected admin auth routes (require admin authentication)
router.post('/register', authenticate, authorize(['admin']), register);

export default router;
