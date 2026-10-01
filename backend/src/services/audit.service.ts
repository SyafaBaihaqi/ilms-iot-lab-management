import prisma from '../utils/prisma';

export interface AuditLogEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, any> | null;
}

export class AuditService {
  static async log(entry: AuditLogEntry) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          ipAddress: entry.ipAddress ?? null,
          metadata: (entry.metadata ?? undefined) as any
        }
      });
    } catch (err) {
      console.error('[Audit] gagal menyimpan audit log:', err);
      return null;
    }
  }

  static async getAll(options: {
    userId?: string;
    entityType?: string;
    action?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.min(Number(options.limit) || 25, 200);
    const where: any = {};

    if (options.userId) where.userId = options.userId;
    if (options.entityType) where.entityType = options.entityType;
    if (options.action) where.action = { contains: options.action };
    if (options.search) {
      where.OR = [
        { action: { contains: options.search, mode: 'insensitive' } },
        { entityType: { contains: options.search, mode: 'insensitive' } },
        { entityId: { contains: options.search, mode: 'insensitive' } },
        { user: { fullName: { contains: options.search, mode: 'insensitive' } } },
        { user: { username: { contains: options.search, mode: 'insensitive' } } }
      ];
    }
    if (options.from || options.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = new Date(options.from);
      if (options.to) where.createdAt.lte = new Date(options.to);
    }

    const [total, data] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, username: true, fullName: true, role: { select: { name: true } } } }
        }
      })
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async getById(id: string) {
    return prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, fullName: true, role: { select: { name: true } } } }
      }
    });
  }

  static async getFacets() {
    const [entityTypes, actions] = await Promise.all([
      prisma.auditLog.groupBy({ by: ['entityType'], _count: { _all: true } }),
      prisma.auditLog.groupBy({ by: ['action'], _count: { _all: true }, orderBy: { action: 'asc' } })
    ]);

    return {
      entityTypes: entityTypes.map((e) => ({ value: e.entityType, count: e._count._all })),
      actions: actions.map((a) => ({ value: a.action, count: a._count._all }))
    };
  }
}
