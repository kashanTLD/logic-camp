import { Router } from 'express';
import { login, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

// Public auth routes
router.post('/login', login);

// Protected auth routes
router.get('/me', authenticate, getMe);

export default router;
