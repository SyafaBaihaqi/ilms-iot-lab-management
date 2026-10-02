import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireStaff } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);
router.post('/', requireStaff, CategoryController.create);
router.put('/:id', requireStaff, CategoryController.update);
router.delete('/:id', requireStaff, CategoryController.delete);

export default router;