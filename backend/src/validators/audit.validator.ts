import { z } from 'zod';

export const auditQuerySchema = z.object({
  userId: z.string().optional(),
  entityType: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional()
});
