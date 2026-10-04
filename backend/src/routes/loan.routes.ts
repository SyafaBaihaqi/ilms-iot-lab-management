import { Router } from 'express';
import { LoanController } from '../controllers/loan.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAnyRole, requireStaff } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', LoanController.getAll);
router.get('/:id/letter', requireStaff, LoanController.letter);
router.get('/:id', LoanController.getById);
router.post('/', requireAnyRole, LoanController.create);
router.put('/:id/approve', requireStaff, LoanController.approve);
router.put('/:id/reject', requireStaff, LoanController.reject);
router.put('/:id/return', requireStaff, LoanController.processReturn);
router.put('/:id/cancel', requireAnyRole, LoanController.cancel);

export default router;