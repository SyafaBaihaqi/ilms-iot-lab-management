import prisma from '../utils/prisma';
import { LoanStatus, DeviceStatus } from '@prisma/client';

export class DashboardService {
  static async getSummary() {
    const [
      totalComponents,
      stockAggregate,
      loansCount,
      pendingLoansCount,
      borrowedLoansCount,
      overdueLoansCount,
      usersCount,
      devicesCount,
      onlineDevicesCount,
      recentHistory,
      categoryDistribution
    ] = await Promise.all([
      prisma.component.count({ where: { deletedAt: null } }),
      prisma.component.aggregate({
        where: { deletedAt: null },
        _sum: {
          stockTotal: true,
          stockAvailable: true
        }
      }),
      prisma.loan.count(),
      prisma.loan.count({ where: { status: LoanStatus.Pending } }),
      prisma.loan.count({ where: { status: LoanStatus.Borrowed } }),
      prisma.loan.count({ where: { status: LoanStatus.Overdue } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.device.count(),
      prisma.device.count({ where: { status: DeviceStatus.Online } }),
      prisma.componentStockHistory.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          component: { select: { id: true, name: true, inventoryCode: true } },
          user: { select: { id: true, fullName: true, username: true } }
        }
      }),
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: { components: { where: { deletedAt: null } } }
          }
        }
      })
    ]);

    const stockTotal = stockAggregate._sum.stockTotal || 0;
    const stockAvailable = stockAggregate._sum.stockAvailable || 0;
    const stockBorrowed = stockTotal - stockAvailable;

    return {
      inventory: {
        totalComponents,
        stockTotal,
        stockAvailable,
        stockBorrowed
      },
      loans: {
        total: loansCount,
        pending: pendingLoansCount,
        borrowed: borrowedLoansCount,
        overdue: overdueLoansCount
      },
      users: {
        total: usersCount
      },
      devices: {
        total: devicesCount,
        online: onlineDevicesCount,
        offline: devicesCount - onlineDevicesCount
      },
      recentActivity: recentHistory,
      categories: categoryDistribution.map((c) => ({
        name: c.name,
        count: c._count.components
      }))
    };
  }
}
