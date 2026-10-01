import { z } from 'zod';

export const sensorReadingSchema = z.object({
  sensorType: z.string().min(1, 'sensorType is required (e.g. temperature, humidity, distance)'),
  value: z.number({ required_error: 'value is required' }),
  unit: z.string().optional()
});

export const batchSensorReadingSchema = z.object({
  readings: z.array(sensorReadingSchema).min(1)
});
