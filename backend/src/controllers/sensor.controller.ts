import { Request, Response, NextFunction } from 'express';
import { SensorService } from '../services/sensor.service';
import { sensorReadingSchema, batchSensorReadingSchema } from '../validators/sensor.validator';
import { sendSuccess } from '../utils/response';
import { DeviceRequest } from '../middlewares/apiKey.middleware';

export class SensorController {
  // ===== ESP32 Endpoint (API Key) =====
  static async recordReading(req: DeviceRequest, res: Response, next: NextFunction) {
    try {
      const validated = sensorReadingSchema.parse(req.body);
      const result = await SensorService.recordReading(req.device!.id, validated);
      return sendSuccess(res, result, 'Sensor reading recorded', 201);
    } catch (err) {
      next(err);
    }
  }

  // ===== ESP32 Batch Endpoint (API Key) =====
  static async recordBatch(req: DeviceRequest, res: Response, next: NextFunction) {
    try {
      const validated = batchSensorReadingSchema.parse(req.body);
      const result = await SensorService.recordBatch(req.device!.id, validated.readings);
      return sendSuccess(res, result, 'Batch sensor readings recorded', 201);
    } catch (err) {
      next(err);
    }
  }

  // ===== Admin / Web Endpoints (JWT) =====
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const deviceId = req.query.deviceId as string | undefined;
      const sensorType = req.query.sensorType as string | undefined;
      const limit = Number(req.query.limit) || 100;

      let results: any[];
      if (deviceId) {
        results = await SensorService.getHistoryByDevice(deviceId, sensorType, limit);
      } else {
        results = await SensorService.getAll({ deviceId, sensorType, limit });
      }

      return sendSuccess(res, results);
    } catch (err) {
      next(err);
    }
  }

  static async getLatest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SensorService.getLatestByDevice(req.params.deviceId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SensorService.getHistoryByDevice(
        req.params.deviceId,
        req.query.sensorType as string | undefined,
        Number(req.query.limit) || 100
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}