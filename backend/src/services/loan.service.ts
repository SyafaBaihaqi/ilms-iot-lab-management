import prisma from '../utils/prisma';
import { LoanStatus, DetailCondition, TransactionType } from '@prisma/client';

export class LoanService {
  static async getAll(options: {
    userId?: string;
    isAdmin: boolean;
    status?: LoanStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (!options.isAdmin && options.userId) {
      where.userId = options.userId;
    }
    if (options.status) {
      where.status = options.status;
    }

    const [total, loans] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, username: true, email: true } },
          approver: { select: { id: true, fullName: true, username: true } },
          details: {
            include: {
              component: { select: { id: true, name: true, inventoryCode: true } }
            }
          }
        }
      })
    ]);

    return {
      items: loans,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getById(id: string, userId?: string, isAdmin = false) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, username: true, email: true, phone: true } },
        approver: { select: { id: true, fullName: true, username: true } },
        details: {
          include: {
            component: { select: { id: true, name: true, inventoryCode: true, photoUrl: true, location: true } }
          }
        }
      }
    });

    if (!loan) {
      throw { statusCode: 404, message: 'Loan transaction not found', code: 'LOAN_NOT_FOUND' };
    }

    if (!isAdmin && loan.userId !== userId) {
      throw { statusCode: 403, message: 'Unauthorized to view this loan transaction', code: 'FORBIDDEN' };
    }

    return loan;
  }

  static async create(userId: string, data: { dueDate: string; notes?: string; items: { componentId: string; quantity: number }[] }) {
    return prisma.$transaction(async (tx) => {
      // Validate availability for each component
      for (const item of data.items) {
        const comp = await tx.component.findUnique({ where: { id: item.componentId } });
        if (!comp || comp.deletedAt) {
          throw { statusCode: 404, message: `Component ${item.componentId} not found or inactive`, code: 'COMPONENT_NOT_FOUND' };
        }
        if (comp.stockAvailable < item.quantity) {
          throw {
            statusCode: 422,
            message: `Insufficient stock for "${comp.name}". Available: ${comp.stockAvailable}, requested: ${item.quantity}`,
            code: 'STOCK_INSUFFICIENT',
            details: { componentId: comp.id, name: comp.name, available: comp.stockAvailable, requested: item.quantity }
          };
        }
      }

      const loan = await tx.loan.create({
        data: {
          userId,
          loanDate: new Date(),
          dueDate: new Date(data.dueDate),
          status: LoanStatus.Pending,
          notes: data.notes,
          details: {
            create: data.items.map((it) => ({
              componentId: it.componentId,
              quantity: it.quantity,
              conditionBefore: DetailCondition.Good
            }))
          }
        },
        include: {
          details: {
            include: { component: true }
          }
        }
      });

      return loan;
    });
  }

  static async approve(loanId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { details: { include: { component: true } } }
      });

      if (!loan) {
        throw { statusCode: 404, message: 'Loan not found', code: 'LOAN_NOT_FOUND' };
      }

      if (loan.status !== LoanStatus.Pending) {
        throw { statusCode: 400, message: `Cannot approve loan in status "${loan.status}"`, code: 'INVALID_STATUS' };
      }

      // Decrement stock_available atomically
      for (const detail of loan.details) {
        const comp = await tx.component.findUnique({ where: { id: detail.componentId } });
        if (!comp || comp.stockAvailable < detail.quantity) {
          throw {
            statusCode: 422,
            message: `Cannot approve: Stock for "${comp?.name || detail.componentId}" became insufficient`,
            code: 'STOCK_INSUFFICIENT'
          };
        }

        const stockBefore = comp.stockAvailable;
        const stockAfter = stockBefore - detail.quantity;

        await tx.component.update({
          where: { id: comp.id },
          data: { stockAvailable: stockAfter }
        });

        await tx.componentStockHistory.create({
          data: {
            componentId: comp.id,
            userId: adminId,
            transactionType: TransactionType.BORROWED,
            quantity: detail.quantity,
            stockBefore,
            stockAfter,
            referenceType: 'LOAN',
            referenceId: loan.id,
            notes: `Borrowed by student (Loan ID: ${loan.id})`
          }
        });
      }

      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.Borrowed,
          approvedBy: adminId
        },
        include: { details: true, user: true }
      });

      // Create in-app notification for user
      await tx.notification.create({
        data: {
          userId: loan.userId,
          type: 'LOAN_APPROVED',
          title: 'Peminjaman Disetujui',
          message: `Pengajuan peminjaman Anda telah disetujui. Silakan ambil komponen di laboratorium sebelum jatuh tempo.`
        }
      });

      return updatedLoan;
    });
  }

  static async reject(loanId: string, adminId: string, reason?: string) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw { statusCode: 404, message: 'Loan not found', code: 'LOAN_NOT_FOUND' };
    }

    if (loan.status !== LoanStatus.Pending) {
      throw { statusCode: 400, message: `Cannot reject loan in status "${loan.status}"`, code: 'INVALID_STATUS' };
    }

    const updated = await prisma.loan.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.Rejected,
        approvedBy: adminId,
        notes: reason ? `${loan.notes || ''} [Rejected Reason: ${reason}]` : loan.notes
      }
    });

    await prisma.notification.create({
      data: {
        userId: loan.userId,
        type: 'LOAN_REJECTED',
        title: 'Pengajuan Peminjaman Ditolak',
        message: reason ? `Pengajuan peminjaman Anda ditolak. Alasan: ${reason}` : 'Pengajuan peminjaman Anda ditolak oleh admin.'
      }
    });

    return updated;
  }

  static async processReturn(
    loanId: string,
    adminId: string,
    items: { loanDetailId: string; conditionAfter: DetailCondition; damageNotes?: string }[]
  ) {
    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { details: { include: { component: true } } }
      });

      if (!loan) {
        throw { statusCode: 404, message: 'Loan not found', code: 'LOAN_NOT_FOUND' };
      }

      if (loan.status !== LoanStatus.Borrowed && loan.status !== LoanStatus.Overdue) {
        throw { statusCode: 400, message: `Cannot return loan in status "${loan.status}"`, code: 'INVALID_STATUS' };
      }

      for (const returnItem of items) {
        const detail = loan.details.find((d) => d.id === returnItem.loanDetailId);
        if (!detail) continue;

        await tx.loanDetail.update({
          where: { id: returnItem.loanDetailId },
          data: {
            conditionAfter: returnItem.conditionAfter,
            damageNotes: returnItem.damageNotes
          }
        });

        const comp = await tx.component.findUnique({ where: { id: detail.componentId } });
        if (!comp) continue;

        const stockBefore = comp.stockAvailable;
        let stockAfter = stockBefore;

        if (returnItem.conditionAfter === DetailCondition.Good) {
          stockAfter = Math.min(comp.stockTotal, stockBefore + detail.quantity);
          await tx.component.update({
            where: { id: comp.id },
            data: { stockAvailable: stockAfter }
          });

          await tx.componentStockHistory.create({
            data: {
              componentId: comp.id,
              userId: adminId,
              transactionType: TransactionType.RETURNED,
              quantity: detail.quantity,
              stockBefore,
              stockAfter,
              referenceType: 'LOAN_RETURN',
              referenceId: loan.id,
              notes: `Returned in good condition`
            }
          });
        } else {
          // Damaged: stock total decreases or goes to damaged state
          const newTotal = Math.max(0, comp.stockTotal - detail.quantity);
          await tx.component.update({
            where: { id: comp.id },
            data: {
              stockTotal: newTotal
            }
          });

          await tx.componentStockHistory.create({
            data: {
              componentId: comp.id,
              userId: adminId,
              transactionType: TransactionType.DAMAGED,
              quantity: detail.quantity,
              stockBefore,
              stockAfter: stockBefore,
              referenceType: 'LOAN_RETURN_DAMAGE',
              referenceId: loan.id,
              notes: `Returned DAMAGED: ${returnItem.damageNotes || 'No notes'}`
            }
          });
        }
      }

      const updated = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.Returned,
          returnDate: new Date()
        }
      });

      await tx.notification.create({
        data: {
          userId: loan.userId,
          type: 'LOAN_RETURNED',
          title: 'Komponen Berhasil Dikembalikan',
          message: `Transaksi peminjaman Anda telah selesai diverifikasi oleh pihak lab.`
        }
      });

      return updated;
    });
  }

  static async markOverdue(currentDate: Date) {
    const result = await prisma.loan.updateMany({
      where: {
        status: LoanStatus.Borrowed,
        dueDate: { lt: currentDate },
        returnDate: null
      },
      data: { status: LoanStatus.Overdue }
    });

    if (result.count > 0) {
      const overdueLoans = await prisma.loan.findMany({
        where: { status: LoanStatus.Overdue },
        select: { id: true, userId: true }
      });

      for (const loan of overdueLoans) {
        await prisma.notification.create({
          data: {
            userId: loan.userId,
            type: 'LOAN_OVERDUE',
            title: 'Peminjaman Jatuh Tempo',
            message: 'Peminjaman Anda telah melewati jatuh tempo. Segera kembalikan komponen ke laboratorium.'
          }
        });
      }
    }

    return { count: result.count };
  }

  static async cancel(loanId: string, userId: string) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw { statusCode: 404, message: 'Loan not found', code: 'LOAN_NOT_FOUND' };
    }

    if (loan.userId !== userId) {
      throw { statusCode: 403, message: 'Unauthorized to cancel this loan', code: 'FORBIDDEN' };
    }

    if (loan.status !== LoanStatus.Pending) {
      throw { statusCode: 400, message: 'Only Pending loans can be cancelled', code: 'CANNOT_CANCEL' };
    }

    return prisma.loan.update({
      where: { id: loanId },
      data: { status: LoanStatus.Cancelled }
    });
  }
}
