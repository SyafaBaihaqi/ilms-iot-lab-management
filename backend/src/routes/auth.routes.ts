import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', authenticateJwt, requireAdmin, AuthController.register);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.get('/me', authenticateJwt, AuthController.getProfile);
router.put('/change-password', authenticateJwt, AuthController.changePassword);

export default router;