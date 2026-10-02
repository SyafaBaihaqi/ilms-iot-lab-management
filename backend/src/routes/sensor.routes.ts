import { Router } from 'express';
import { SensorController } from '../controllers/sensor.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireStaff } from '../middlewares/role.middleware';
import { authenticateApiKey } from '../middlewares/apiKey.middleware';

const router = Router();

// ===== ESP32 Endpoints (API Key) =====
router.post('/readings', authenticateApiKey, SensorController.recordReading);
router.post('/readings/batch', authenticateApiKey, SensorController.recordBatch);

// ===== Web Staff Endpoints (JWT, Admin + Dosen) =====
router.use(authenticateJwt);

router.get('/readings', requireStaff, SensorController.getAll);
router.get('/devices/:deviceId/readings/latest', SensorController.getLatest);
router.get('/devices/:deviceId/readings/history', SensorController.getHistory);

export default router;