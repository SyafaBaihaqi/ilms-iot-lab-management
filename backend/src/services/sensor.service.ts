import prisma from '../utils/prisma';
import { DeviceStatus } from '@prisma/client';

export class SensorService {
  static async recordReading(deviceId: string, data: { sensorType: string; value: number; unit?: string }) {
    // 1. Insert sensor reading
    const reading = await prisma.sensorReading.create({
      data: {
        deviceId,
        sensorType: data.sensorType,
        value: data.value,
        unit: data.unit
      }
    });

    // 2. Automatically update device last_seen and online status
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        lastSeen: new Date(),
        status: DeviceStatus.Online
      }
    });

    return reading;
  }

  static async recordBatch(deviceId: string, readings: { sensorType: string; value: number; unit?: string }[]) {
    const created = await prisma.$transaction(async (tx) => {
      const records = await Promise.all(
        readings.map((r) =>
          tx.sensorReading.create({
            data: {
              deviceId,
              sensorType: r.sensorType,
              value: r.value,
              unit: r.unit
            }
          })
        )
      );

      await tx.device.update({
        where: { id: deviceId },
        data: {
          lastSeen: new Date(),
          status: DeviceStatus.Online
        }
      });

      return records;
    });

    return created;
  }

  static async getLatestByDevice(deviceId: string) {
    // Find unique sensor types for this device
    const sensorTypes = await prisma.sensorReading.findMany({
      where: { deviceId },
      distinct: ['sensorType'],
      select: { sensorType: true }
    });

    const latestReadings = await Promise.all(
      sensorTypes.map(async (st) => {
        return prisma.sensorReading.findFirst({
          where: { deviceId, sensorType: st.sensorType },
          orderBy: { recordedAt: 'desc' }
        });
      })
    );

    return latestReadings.filter(Boolean);
  }

  static async getHistoryByDevice(deviceId: string, sensorType?: string, limit = 100) {
    const where: any = { deviceId };
    if (sensorType) {
      where.sensorType = sensorType;
    }

    return prisma.sensorReading.findMany({
      where,
      take: limit,
      orderBy: { recordedAt: 'desc' }
    });
  }

  static async getAll(options: { deviceId?: string; sensorType?: string; limit?: number }) {
    const where: any = {};
    if (options.deviceId) {
      where.deviceId = options.deviceId;
    }
    if (options.sensorType) {
      where.sensorType = options.sensorType;
    }

    return prisma.sensorReading.findMany({
      where,
      take: Math.min(Number(options.limit) || 100, 500),
      orderBy: { recordedAt: 'desc' },
      include: {
        device: { select: { id: true, deviceName: true, esp32Id: true } }
      }
    });
  }

  static async cleanupOldReadings(retentionDays = 30) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await prisma.sensorReading.deleteMany({
      where: {
        recordedAt: { lt: cutoff }
      }
    });
    return { deletedCount: result.count };
  }
}
