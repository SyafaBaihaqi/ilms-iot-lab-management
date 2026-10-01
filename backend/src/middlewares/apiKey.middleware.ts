import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { sendError } from '../utils/response';

export interface DeviceRequest extends Request {
  device?: {
    id: string;
    deviceName: string;
    esp32Id: string;
  };
}

export const authenticateApiKey = async (req: DeviceRequest, res: Response, next: NextFunction) => {
  const apiKey = (req.headers['x-api-key'] || req.headers['X-API-Key']) as string;
  const esp32Id = (req.headers['x-esp32-id'] || req.body?.esp32Id) as string;

  if (!apiKey) {
    return sendError(res, 'Device API key required in X-API-Key header', 401, 'API_KEY_REQUIRED');
  }

  try {
    let matchedDevice = null;

    if (esp32Id) {
      const device = await prisma.device.findUnique({
        where: { esp32Id }
      });

      if (device && (await bcrypt.compare(apiKey, device.apiKeyHash))) {
        matchedDevice = device;
      }
    } else {
      // Find all devices and verify against hashes
      const devices = await prisma.device.findMany();
      for (const dev of devices) {
        if (await bcrypt.compare(apiKey, dev.apiKeyHash)) {
          matchedDevice = dev;
          break;
        }
      }
    }

    if (!matchedDevice) {
      return sendError(res, 'Invalid API Key or ESP32 ID', 401, 'INVALID_API_KEY');
    }

    req.device = {
      id: matchedDevice.id,
      deviceName: matchedDevice.deviceName,
      esp32Id: matchedDevice.esp32Id
    };

    next();
  } catch (error: any) {
    return sendError(res, 'Device authentication failed: ' + error.message, 500, 'AUTH_ERROR');
  }
};
