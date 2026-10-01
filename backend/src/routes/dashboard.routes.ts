import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);
router.use(requireAdmin);

router.get('/summary', DashboardController.getSummary);

export default router;