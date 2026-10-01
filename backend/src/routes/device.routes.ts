import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { authenticateApiKey } from '../middlewares/apiKey.middleware';

const router = Router();

// ===== ESP32 Device Endpoints (API Key) =====
router.post('/register', DeviceController.register);
router.post('/heartbeat', authenticateApiKey, DeviceController.heartbeat);
router.get('/:id/config', authenticateApiKey, DeviceController.getConfig);

// ===== Admin Management Endpoints (JWT) =====
router.use(authenticateJwt);
router.use(requireAdmin);

router.get('/', DeviceController.getAll);
router.post('/', DeviceController.create);
router.get('/:id', DeviceController.getById);
router.put('/:id', DeviceController.update);
router.delete('/:id', DeviceController.delete);

export default router;