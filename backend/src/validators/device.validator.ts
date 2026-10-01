import { z } from 'zod';
import { DeviceStatus } from '@prisma/client';

export const registerDeviceSchema = z.object({
  esp32Id: z.string().min(3, 'ESP32 Chip ID is required'),
  deviceName: z.string().min(2, 'Device name is required'),
  deviceType: z.string().min(2, 'Device type is required'),
  firmwareVersion: z.string().optional(),
  location: z.string().optional()
});

export const updateDeviceSchema = z.object({
  deviceName: z.string().min(2).optional(),
  deviceType: z.string().min(2).optional(),
  location: z.string().optional(),
  status: z.nativeEnum(DeviceStatus).optional(),
  firmwareVersion: z.string().optional()
});
