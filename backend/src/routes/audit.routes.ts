import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);
router.use(requireAdmin);

router.get('/', AuditController.getAll);
router.get('/facets', AuditController.getFacets);
router.get('/:id', AuditController.getById);

export default router;
