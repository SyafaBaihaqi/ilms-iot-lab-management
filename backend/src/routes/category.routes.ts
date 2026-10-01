import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);
router.post('/', requireAdmin, CategoryController.create);
router.put('/:id', requireAdmin, CategoryController.update);
router.delete('/:id', requireAdmin, CategoryController.delete);

export default router;