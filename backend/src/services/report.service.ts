import prisma from '../utils/prisma';

export class ReportService {
  static async getInventoryReport() {
    const components = await prisma.component.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { name: 'asc' }
    });

    return components.map((c) => ({
      inventoryCode: c.inventoryCode,
      name: c.name,
      category: c.category.name,
      stockTotal: c.stockTotal,
      stockAvailable: c.stockAvailable,
      condition: c.condition,
      location: c.location || '-',
      estimatedPrice: c.estimatedPrice ? Number(c.estimatedPrice) : 0,
      status: c.status
    }));
  }

  static async getBorrowingReport(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.loanDate = {};
      if (startDate) where.loanDate.gte = new Date(startDate);
      if (endDate) where.loanDate.lte = new Date(endDate);
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        user: true,
        approver: true,
        details: { include: { component: true } }
      },
      orderBy: { loanDate: 'desc' }
    });

    return loans.map((l) => ({
      id: l.id,
      borrower: l.user.fullName,
      email: l.user.email,
      loanDate: l.loanDate.toISOString().split('T')[0],
      dueDate: l.dueDate.toISOString().split('T')[0],
      returnDate: l.returnDate ? l.returnDate.toISOString().split('T')[0] : '-',
      status: l.status,
      approvedBy: l.approver?.fullName || '-',
      items: l.details.map((d) => `${d.component.name} (${d.quantity}x)`).join(', ')
    }));
  }

  static async getDamageReport() {
    const damagedDetails = await prisma.loanDetail.findMany({
      where: { conditionAfter: 'Damaged' },
      include: {
        loan: { include: { user: true } },
        component: { include: { category: true } }
      },
      orderBy: { loan: { updatedAt: 'desc' } }
    });

    return damagedDetails.map((d) => ({
      loanId: d.loanId,
      componentName: d.component.name,
      inventoryCode: d.component.inventoryCode,
      quantity: d.quantity,
      borrower: d.loan.user.fullName,
      date: d.loan.returnDate ? d.loan.returnDate.toISOString().split('T')[0] : '-',
      damageNotes: d.damageNotes || '-'
    }));
  }

  static async getIoTReport() {
    const devices = await prisma.device.findMany({
      include: {
        _count: { select: { readings: true } }
      },
      orderBy: { registeredAt: 'desc' }
    });

    return devices.map((d) => ({
      esp32Id: d.esp32Id,
      name: d.deviceName,
      type: d.deviceType,
      location: d.location || '-',
      status: d.status,
      firmwareVersion: d.firmwareVersion || '-',
      ipAddress: d.ipAddress || '-',
      lastSeen: d.lastSeen ? d.lastSeen.toISOString() : '-',
      totalReadings: d._count.readings
    }));
  }

  static toCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}
