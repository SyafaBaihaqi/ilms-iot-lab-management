import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAnyRole, requireStaff } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', TicketController.getAll);
router.get('/stats', TicketController.getStats);
router.get('/:id', TicketController.getById);
router.post('/', requireAnyRole, TicketController.create);
router.post('/:id/replies', requireAnyRole, TicketController.reply);
router.put('/:id', requireStaff, TicketController.updateStatus);
router.put('/:id/close', requireAnyRole, TicketController.close);
router.delete('/:id', requireAnyRole, TicketController.remove);

export default router;
