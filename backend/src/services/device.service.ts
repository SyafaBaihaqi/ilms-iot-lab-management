import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DeviceStatus } from '@prisma/client';

export class DeviceService {
  static async registerDevice(data: {
    esp32Id: string;
    deviceName: string;
    deviceType: string;
    firmwareVersion?: string;
    location?: string;
  }) {
    const existing = await prisma.device.findUnique({
      where: { esp32Id: data.esp32Id }
    });

    if (existing) {
      return {
        deviceId: existing.id,
        esp32Id: existing.esp32Id,
        deviceName: existing.deviceName,
        status: existing.status,
        message: 'Device already registered. API key remains unchanged.'
      };
    }

    // Generate strong random API key
    const rawApiKey = `ilms_dev_${crypto.randomBytes(24).toString('hex')}`;
    const salt = await bcrypt.genSalt(10);
    const apiKeyHash = await bcrypt.hash(rawApiKey, salt);

    const device = await prisma.device.create({
      data: {
        esp32Id: data.esp32Id,
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        firmwareVersion: data.firmwareVersion || '1.0.0',
        location: data.location || 'Laboratorium IoT',
        apiKeyHash,
        status: DeviceStatus.Offline
      }
    });

    return {
      deviceId: device.id,
      esp32Id: device.esp32Id,
      deviceName: device.deviceName,
      apiKey: rawApiKey, // Only visible upon first registration!
      message: 'Device registered successfully. Please save this API key securely.'
    };
  }

  static async heartbeat(deviceId: string, ipAddress?: string) {
    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: {
        lastSeen: new Date(),
        status: DeviceStatus.Online,
        ...(ipAddress ? { ipAddress } : {})
      }
    });

    return {
      status: 'acknowledged',
      serverTime: new Date().toISOString(),
      deviceStatus: updated.status
    };
  }

  static async getAll() {
    return prisma.device.findMany({
      orderBy: { registeredAt: 'desc' },
      include: {
        _count: { select: { readings: true } }
      }
    });
  }

  static async getById(id: string) {
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        readings: {
          take: 20,
          orderBy: { recordedAt: 'desc' }
        }
      }
    });

    if (!device) {
      throw { statusCode: 404, message: 'Device not found', code: 'DEVICE_NOT_FOUND' };
    }

    return device;
  }

  static async update(id: string, data: any) {
    await this.getById(id);
    return prisma.device.update({
      where: { id },
      data
    });
  }

  static async delete(id: string) {
    await this.getById(id);
    return prisma.device.delete({ where: { id } });
  }

  static async checkOfflineDevices(thresholdMinutes = 2) {
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const staleDevices = await prisma.device.findMany({
      where: {
        status: DeviceStatus.Online,
        OR: [
          { lastSeen: { lt: cutoff } },
          { lastSeen: null }
        ]
      }
    });

    if (staleDevices.length === 0) return { updatedCount: 0 };

    const ids = staleDevices.map((d) => d.id);
    await prisma.device.updateMany({
      where: { id: { in: ids } },
      data: { status: DeviceStatus.Offline }
    });

    return { updatedCount: ids.length, devices: staleDevices.map((d) => d.deviceName) };
  }
}
