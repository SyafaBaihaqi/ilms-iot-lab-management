import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin, requireRole } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', TicketController.getAll);
router.get('/stats', TicketController.getStats);
router.get('/:id', TicketController.getById);
router.post('/', requireRole(['Admin', 'User']), TicketController.create);
router.post('/:id/replies', requireRole(['Admin', 'User']), TicketController.reply);
router.put('/:id', requireAdmin, TicketController.updateStatus);
router.put('/:id/close', requireRole(['Admin', 'User']), TicketController.close);
router.delete('/:id', requireRole(['Admin', 'User']), TicketController.remove);

export default router;
