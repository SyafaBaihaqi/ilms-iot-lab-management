import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireStaff } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);
router.use(requireStaff);

router.get('/summary', DashboardController.getSummary);

export default router;