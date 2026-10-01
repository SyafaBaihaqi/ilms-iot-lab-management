import { Request, Response, NextFunction } from 'express';
import { DeviceService } from '../services/device.service';
import { registerDeviceSchema, updateDeviceSchema } from '../validators/device.validator';
import { sendSuccess } from '../utils/response';
import { DeviceRequest } from '../middlewares/apiKey.middleware';

export class DeviceController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DeviceService.getAll();
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerDeviceSchema.parse(req.body);
      const result = await DeviceService.registerDevice(validated);
      return sendSuccess(res, result, 'Device created. Save the API key!', 201);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DeviceService.getById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateDeviceSchema.parse(req.body);
      const result = await DeviceService.update(req.params.id, validated);
      return sendSuccess(res, result, 'Device updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await DeviceService.delete(req.params.id);
      return sendSuccess(res, null, 'Device deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // ===== ESP32 Public/Device Endpoints =====

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerDeviceSchema.parse(req.body);
      const result = await DeviceService.registerDevice(validated);
      return sendSuccess(res, result, 'Device registered. Save your API key!', result.apiKey ? 201 : 200);
    } catch (err) {
      next(err);
    }
  }

  static async heartbeat(req: DeviceRequest, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] as string;
      const result = await DeviceService.heartbeat(req.device!.id, ip);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getConfig(req: DeviceRequest, res: Response, next: NextFunction) {
    try {
      const device = await DeviceService.getById(req.device!.id);
      return sendSuccess(res, {
        deviceId: device.id,
        esp32Id: device.esp32Id,
        location: device.location,
        firmwareVersion: device.firmwareVersion,
        heartbeatIntervalSeconds: 60,
        serverTime: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }
}