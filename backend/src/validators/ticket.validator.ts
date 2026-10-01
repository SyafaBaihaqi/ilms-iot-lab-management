import { z } from 'zod';
import { TicketPriority, TicketStatus } from '@prisma/client';

export const createTicketSchema = z.object({
  subject: z
    .string()
    .min(5, 'Subjek minimal 5 karakter')
    .max(150, 'Subjek maksimal 150 karakter'),
  message: z.string().min(10, 'Pesan minimal 10 karakter'),
  priority: z.nativeEnum(TicketPriority).optional()
});

export const replyTicketSchema = z.object({
  message: z.string().min(1, 'Pesan balasan tidak boleh kosong')
});

export const updateTicketSchema = z
  .object({
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(TicketPriority).optional()
  })
  .refine((data) => data.status || data.priority, {
    message: 'Status atau prioritas harus diisi'
  });
