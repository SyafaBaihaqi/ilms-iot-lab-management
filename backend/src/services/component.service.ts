import prisma from '../utils/prisma';
import { ComponentCondition, ComponentStatus, TransactionType } from '@prisma/client';

export interface ComponentFilter {
  search?: string;
  categoryId?: string;
  condition?: ComponentCondition;
  status?: ComponentStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
}

export class ComponentService {
  static async getAll(filter: ComponentFilter) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null
    };

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { inventoryCode: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { location: { contains: filter.search, mode: 'insensitive' } }
      ];
    }

    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }

    if (filter.condition) {
      where.condition = filter.condition;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    const sortMap: Record<string, any> = {
      name_asc: { name: 'asc' },
      name_desc: { name: 'desc' },
      category_asc: { category: { name: 'asc' } },
      category_desc: { category: { name: 'desc' } },
      stock_asc: { stockAvailable: 'asc' },
      stock_desc: { stockAvailable: 'desc' },
      createdAt_asc: { createdAt: 'asc' },
      createdAt_desc: { createdAt: 'desc' }
    };

    const orderBy = sortMap[filter.sortBy || ''] || sortMap.createdAt_desc;

    const [total, components] = await Promise.all([
      prisma.component.count({ where }),
      prisma.component.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true }
          }
        }
      })
    ]);

    return {
      items: components,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getById(id: string) {
    const comp = await prisma.component.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        stockHistory: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, fullName: true, username: true } }
          }
        }
      }
    });

    if (!comp) {
      throw { statusCode: 404, message: 'Component not found', code: 'COMPONENT_NOT_FOUND' };
    }

    return comp;
  }

  static async create(data: any) {
    const existing = await prisma.component.findUnique({
      where: { inventoryCode: data.inventoryCode }
    });

    if (existing) {
      throw { statusCode: 409, message: `Inventory code '${data.inventoryCode}' already in use`, code: 'DUPLICATE_CODE' };
    }

    return prisma.component.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        inventoryCode: data.inventoryCode,
        description: data.description,
        stockTotal: data.stockTotal,
        stockAvailable: data.stockTotal, // initially all are available
        condition: data.condition || ComponentCondition.Good,
        location: data.location,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        estimatedPrice: data.estimatedPrice,
        photoUrl: data.photoUrl,
        status: data.status || ComponentStatus.Active
      },
      include: { category: true }
    });
  }

  static async update(id: string, data: any) {
    await this.getById(id);

    if (data.inventoryCode) {
      const duplicate = await prisma.component.findFirst({
        where: {
          inventoryCode: data.inventoryCode,
          NOT: { id }
        }
      });
      if (duplicate) {
        throw { statusCode: 409, message: 'Inventory code already in use by another component', code: 'DUPLICATE_CODE' };
      }
    }

    const updatePayload: any = { ...data };
    if (data.purchaseDate) {
      updatePayload.purchaseDate = new Date(data.purchaseDate);
    }

    return prisma.component.update({
      where: { id },
      data: updatePayload,
      include: { category: true }
    });
  }

  static async softDelete(id: string) {
    await this.getById(id);
    return prisma.component.update({
      where: { id },
      data: { deletedAt: new Date(), status: ComponentStatus.Inactive }
    });
  }

  static async adjustStock(
    componentId: string,
    userId: string,
    quantity: number,
    transactionType: TransactionType,
    notes?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const comp = await tx.component.findUnique({
        where: { id: componentId }
      });

      if (!comp || comp.deletedAt) {
        throw { statusCode: 404, message: 'Component not found', code: 'COMPONENT_NOT_FOUND' };
      }

      const stockBefore = comp.stockAvailable;
      let newAvailable = stockBefore + quantity;
      let newTotal = comp.stockTotal;

      if (transactionType === 'IN') {
        newTotal += quantity;
      } else if (transactionType === 'OUT' || transactionType === 'DAMAGED') {
        newTotal = Math.max(0, newTotal - Math.abs(quantity));
        newAvailable = Math.max(0, stockBefore - Math.abs(quantity));
      } else if (transactionType === 'REPAIRED') {
        newAvailable = Math.min(newTotal, stockBefore + Math.abs(quantity));
      }

      if (newAvailable < 0 || newAvailable > newTotal) {
        throw {
          statusCode: 400,
          message: `Invalid stock adjustment. Resulting stockAvailable (${newAvailable}) must be >= 0 and <= stockTotal (${newTotal})`,
          code: 'STOCK_CONSTRAINT_VIOLATION'
        };
      }

      const updated = await tx.component.update({
        where: { id: componentId },
        data: {
          stockTotal: newTotal,
          stockAvailable: newAvailable
        }
      });

      await tx.componentStockHistory.create({
        data: {
          componentId,
          userId,
          transactionType,
          quantity,
          stockBefore,
          stockAfter: newAvailable,
          referenceType: 'MANUAL_ADJUSTMENT',
          notes: notes || `Manual stock adjustment: ${transactionType}`
        }
      });

      return updated;
    });
  }

  static async getStockHistory(componentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.componentStockHistory.count({ where: { componentId } }),
      prisma.componentStockHistory.findMany({
        where: { componentId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, username: true } }
        }
      })
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }
}
