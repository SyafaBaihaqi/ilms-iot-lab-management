import { Router } from 'express';
import { ComponentController } from '../controllers/component.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireStaff } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', ComponentController.getAll);
router.get('/:id', ComponentController.getById);
router.get('/:id/qrcode', ComponentController.getQrCode);
router.get('/:id/history', requireStaff, ComponentController.getStockHistory);
router.post('/', requireStaff, ComponentController.create);
router.put('/:id', requireStaff, ComponentController.update);
router.delete('/:id', requireStaff, ComponentController.delete);
router.post('/:id/adjust-stock', requireStaff, ComponentController.adjustStock);

export default router;