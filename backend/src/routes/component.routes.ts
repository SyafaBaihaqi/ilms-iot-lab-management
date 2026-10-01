import { Router } from 'express';
import { ComponentController } from '../controllers/component.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', ComponentController.getAll);
router.get('/:id', ComponentController.getById);
router.get('/:id/qrcode', ComponentController.getQrCode);
router.get('/:id/history', requireAdmin, ComponentController.getStockHistory);
router.post('/', requireAdmin, ComponentController.create);
router.put('/:id', requireAdmin, ComponentController.update);
router.delete('/:id', requireAdmin, ComponentController.delete);
router.post('/:id/adjust-stock', requireAdmin, ComponentController.adjustStock);

export default router;