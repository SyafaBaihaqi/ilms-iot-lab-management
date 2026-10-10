import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

// Semua peran dapat melihat daftar proyek
router.get('/', ProjectController.getAll);
router.get('/stats', ProjectController.getStats);
router.get('/:id', ProjectController.getById);

// Hanya Admin yang dapat menambah, mengubah, dan menghapus proyek
router.post('/', requireAdmin, ProjectController.create);
router.put('/:id', requireAdmin, ProjectController.update);
router.delete('/:id', requireAdmin, ProjectController.delete);

export default router;
