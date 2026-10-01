import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);
router.use(requireAdmin);

router.get('/inventory', ReportController.inventory);
router.get('/borrowing', ReportController.borrowing);
router.get('/damage', ReportController.damage);
router.get('/iot', ReportController.iot);

export default router;