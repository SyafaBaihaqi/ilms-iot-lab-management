import { z } from 'zod';
import { DetailCondition } from '@prisma/client';

export const createLoanItemSchema = z.object({
  componentId: z.string().uuid('Valid component ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1')
});

export const createLoanSchema = z.object({
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Valid due date is required'),
  notes: z.string().optional(),
  items: z.array(createLoanItemSchema).min(1, 'At least one component must be requested')
});

export const returnLoanItemSchema = z.object({
  loanDetailId: z.string().uuid(),
  conditionAfter: z.nativeEnum(DetailCondition).default(DetailCondition.Good),
  damageNotes: z.string().optional()
});

export const returnLoanSchema = z.object({
  items: z.array(returnLoanItemSchema).min(1, 'At least one item must be returned')
});
