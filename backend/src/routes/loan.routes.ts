import { Router } from 'express';
import { LoanController } from '../controllers/loan.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin, requireRole } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', LoanController.getAll);
router.get('/:id', LoanController.getById);
router.post('/', requireRole(['Admin', 'User']), LoanController.create);
router.put('/:id/approve', requireAdmin, LoanController.approve);
router.put('/:id/reject', requireAdmin, LoanController.reject);
router.put('/:id/return', requireAdmin, LoanController.processReturn);
router.put('/:id/cancel', requireRole(['Admin', 'User']), LoanController.cancel);

export default router;