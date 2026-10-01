import prisma from '../utils/prisma';
import { TicketPriority, TicketStatus } from '@prisma/client';

const ticketInclude = {
  user: { select: { id: true, fullName: true, username: true, email: true } },
  assignee: { select: { id: true, fullName: true } },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: { sender: { select: { id: true, fullName: true, username: true } } }
  }
};

export class TicketService {
  static async notifyAdmins(title: string, message: string) {
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true, deletedAt: null },
      select: { id: true }
    });

    if (admins.length === 0) return;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: 'ticket',
        title,
        message
      }))
    });
  }

  static async notifyUser(userId: string, title: string, message: string) {
    await prisma.notification.create({
      data: { userId, type: 'ticket', title, message }
    });
  }

  static async create(userId: string, data: { subject: string; message: string; priority?: TicketPriority }) {
    const ticket = await prisma.ticket.create({
      data: {
        userId,
        subject: data.subject.trim(),
        priority: data.priority || TicketPriority.Medium,
        status: TicketStatus.Open,
        messages: {
          create: {
            senderId: userId,
            message: data.message.trim(),
            isAdmin: false
          }
        }
      },
      include: ticketInclude
    });

    await this.notifyAdmins(
      'Tiket CS Baru',
      `${ticket.subject} — dari ${ticket.user.fullName} (${ticket.user.username})`
    );

    return ticket;
  }

  static async getAll(options: {
    userId: string;
    isAdmin: boolean;
    status?: TicketStatus;
    priority?: TicketPriority;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (!options.isAdmin) {
      where.userId = options.userId;
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.priority) {
      where.priority = options.priority;
    }
    if (options.search) {
      where.OR = [
        { subject: { contains: options.search, mode: 'insensitive' } },
        { user: { fullName: { contains: options.search, mode: 'insensitive' } } },
        { user: { username: { contains: options.search, mode: 'insensitive' } } }
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, fullName: true, username: true } },
          _count: { select: { messages: true } },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { sender: { select: { id: true, fullName: true } } }
          }
        }
      })
    ]);

    return {
      items: tickets,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getById(id: string, userId: string, isAdmin: boolean) {
    const ticket = await prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: ticketInclude
    });

    if (!ticket) {
      throw { statusCode: 404, message: 'Ticket not found', code: 'TICKET_NOT_FOUND' };
    }

    if (!isAdmin && ticket.userId !== userId) {
      throw { statusCode: 403, message: 'Unauthorized to view this ticket', code: 'FORBIDDEN' };
    }

    return ticket;
  }

  static async reply(id: string, senderId: string, isAdmin: boolean, message: string) {
    const ticket = await this.getById(id, senderId, isAdmin);

    const newMessage = await prisma.ticketMessage.create({
      data: { ticketId: id, senderId, message: message.trim(), isAdmin }
    });

    const data: any = {};
    if (isAdmin && ticket.status === TicketStatus.Open) {
      data.status = TicketStatus.In_Progress;
    }
    if (!isAdmin && (ticket.status === TicketStatus.Resolved || ticket.status === TicketStatus.Closed)) {
      data.status = TicketStatus.Open;
      data.closedAt = null;
    }

    const updatedTicket =
      Object.keys(data).length > 0
        ? await prisma.ticket.update({ where: { id }, data })
        : ticket;

    if (isAdmin) {
      await this.notifyUser(
        ticket.userId,
        `Balasan Admin untuk "${ticket.subject}"`,
        message.trim().slice(0, 150)
      );
    } else {
      await this.notifyAdmins(`Balasan Baru pada Tiket "${ticket.subject}"`, ticket.user.fullName);
    }

    return { ticket: updatedTicket, message: newMessage };
  }

  static async updateStatus(
    id: string,
    adminId: string,
    data: { status?: TicketStatus; priority?: TicketPriority }
  ) {
    const ticket = await prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: { id: true, fullName: true } } }
    });

    if (!ticket) {
      throw { statusCode: 404, message: 'Ticket not found', code: 'TICKET_NOT_FOUND' };
    }

    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
      updateData.closedAt = data.status === TicketStatus.Closed ? new Date() : null;
    }
    if (data.priority) {
      updateData.priority = data.priority;
    }
    if (!ticket.assignedTo) {
      updateData.assignedTo = adminId;
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: ticketInclude
    });

    if (data.status && data.status !== ticket.status) {
      await this.notifyUser(
        ticket.userId,
        `Status tiket "${ticket.subject}" → ${data.status}`,
        'Perubahan status oleh admin'
      );
    }

    return updated;
  }

  static async closeOwn(id: string, userId: string, isAdmin: boolean) {
    const ticket = await this.getById(id, userId, isAdmin);

    if (ticket.status === TicketStatus.Closed) return ticket;

    const updated = await prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.Closed, closedAt: new Date() },
      include: ticketInclude
    });

    if (!isAdmin) {
      await this.notifyAdmins(`Tiket Ditutup Pengguna "${ticket.subject}"`, ticket.user.fullName);
    }

    return updated;
  }

  static async remove(id: string, userId: string, isAdmin: boolean) {
    const ticket = await this.getById(id, userId, isAdmin);

    return prisma.ticket.update({
      where: { id: ticket.id },
      data: { deletedAt: new Date() }
    });
  }

  static async getStats(userId: string, isAdmin: boolean) {
    const where: any = { deletedAt: null };
    if (!isAdmin) where.userId = userId;

    const grouped = await prisma.ticket.groupBy({
      by: ['status'],
      where,
      _count: { _all: true }
    });

    const counts: Record<string, number> = {
      Open: 0,
      'In Progress': 0,
      Resolved: 0,
      Closed: 0
    };

    let total = 0;
    grouped.forEach((g) => {
      counts[g.status] = g._count._all;
      total += g._count._all;
    });

    return { total, ...counts };
  }
}
