import { DeviceService } from '../services/device.service';
import { LoanService } from '../services/loan.service';

const OFFLINE_THRESHOLD_MINUTES = Number(process.env.IOT_OFFLINE_THRESHOLD_MINUTES) || 2;

export const checkOfflineDevices = async () => {
  try {
    const result = await DeviceService.checkOfflineDevices(OFFLINE_THRESHOLD_MINUTES);
    if (result.updatedCount > 0) {
      console.log(`[Job] [${new Date().toISOString()}] Marked ${result.updatedCount} device(s) as offline:`, result.devices);
    }
  } catch (err) {
    console.error('[Job] checkOfflineDevices failed:', err);
  }
};

export const markOverdueLoans = async () => {
  try {
    const today = new Date();
    const overdue = await LoanService.markOverdue(today);
    if (overdue.count > 0) {
      console.log(`[Job] [${new Date().toISOString()}] Marked ${overdue.count} loan(s) as overdue.`);
    }
  } catch (err) {
    console.error('[Job] markOverdueLoans failed:', err);
  }
};

export const cleanupSensorData = async () => {
  try {
    const retentionDays = Number(process.env.SENSOR_RETENTION_DAYS) || 30;
    const prisma = (await import('../services/sensor.service')).SensorService;
    const result = await prisma.cleanupOldReadings(retentionDays);
    if (result.deletedCount > 0) {
      console.log(`[Job] [${new Date().toISOString()}] Cleaned ${result.deletedCount} old sensor reading(s).`);
    }
  } catch (err) {
    console.error('[Job] cleanupSensorData failed:', err);
  }
};

export const startAllJobs = () => {
  // Device offline detection every minute
  setInterval(checkOfflineDevices, 60 * 1000);
  // Overdue loans detection nightly (every 6 hours)
  setInterval(markOverdueLoans, 6 * 60 * 60 * 1000);
  // Sensor retention cleanup daily
  setInterval(cleanupSensorData, 24 * 60 * 60 * 1000);

  console.log('ILMS background jobs started: device-offline, loan-overdue, sensor-retention.');
};