import { z } from 'zod';
import { ComponentCondition, ComponentStatus } from '@prisma/client';

export const createComponentSchema = z.object({
  categoryId: z.string().uuid('Valid Category ID is required'),
  name: z.string().min(2, 'Name is required'),
  inventoryCode: z.string().min(2, 'Inventory code is required'),
  description: z.string().optional(),
  stockTotal: z.number().int().min(0, 'Total stock must be >= 0'),
  condition: z.nativeEnum(ComponentCondition).default(ComponentCondition.Good),
  location: z.string().optional(),
  purchaseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  estimatedPrice: z.number().min(0).optional(),
  photoUrl: z.string().optional(),
  status: z.nativeEnum(ComponentStatus).default(ComponentStatus.Active)
});

export const updateComponentSchema = createComponentSchema.partial();

export const adjustStockSchema = z.object({
  quantity: z.number().int().refine((val) => val !== 0, 'Quantity cannot be 0'),
  transactionType: z.enum(['IN', 'OUT', 'DAMAGED', 'REPAIRED', 'ADJUSTMENT']),
  notes: z.string().optional()
});
