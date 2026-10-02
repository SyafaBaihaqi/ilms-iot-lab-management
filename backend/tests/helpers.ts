import prisma from '../src/utils/prisma';
import { hashPassword } from '../src/utils/jwt';

export const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin123' };
export const DOSEN_CREDENTIALS = { username: 'dosen1', password: 'dosen123' };
export const MAHASISWA_CREDENTIALS = { username: 'mhs1', password: 'user123' };
export const USER_CREDENTIALS = { username: 'mahasiswa1', password: 'user123' };
export const OTHER_CREDENTIALS = { username: 'mahasiswa2', password: 'user123' };

/** Bersihkan seluruh data (kecuali Role) agar setiap test mulai dari kondisi bersih. */
export const resetDatabase = async () => {
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.loanDetail.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.componentStockHistory.deleteMany();
  await prisma.component.deleteMany();
  await prisma.category.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.device.deleteMany();
  await prisma.user.deleteMany();
};

/** Siapkan role, akun demo, kategori, dan komponen untuk dipakai test. */
export const seedFixtures = async () => {
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Akses penuh' }
  });
  const dosenRole = await prisma.role.upsert({
    where: { name: 'Dosen' },
    update: {},
    create: { name: 'Dosen', description: 'Operasional lab tanpa pengguna dan audit' }
  });
  const mahasiswaRole = await prisma.role.upsert({
    where: { name: 'Mahasiswa' },
    update: {},
    create: { name: 'Mahasiswa', description: 'Peminjam komponen' }
  });
  const userRole = await prisma.role.upsert({
    where: { name: 'User' },
    update: {},
    create: { name: 'User', description: 'Alias umum, setara Mahasiswa' }
  });

  const adminHash = await hashPassword(ADMIN_CREDENTIALS.password);
  const userHash = await hashPassword(USER_CREDENTIALS.password);
  const dosenHash = await hashPassword(DOSEN_CREDENTIALS.password);

  const admin = await prisma.user.create({
    data: {
      username: ADMIN_CREDENTIALS.username,
      email: 'admin@test.local',
      fullName: 'Admin Test',
      passwordHash: adminHash,
      roleId: adminRole.id
    }
  });

  const dosen = await prisma.user.create({
    data: {
      username: DOSEN_CREDENTIALS.username,
      email: 'dosen@test.local',
      fullName: 'Dosen Test',
      nim: '198501012010011001',
      passwordHash: dosenHash,
      roleId: dosenRole.id
    }
  });

  const mahasiswa = await prisma.user.create({
    data: {
      username: MAHASISWA_CREDENTIALS.username,
      email: 'mhs@test.local',
      fullName: 'Mahasiswa Role Test',
      nim: '2022103',
      passwordHash: userHash,
      roleId: mahasiswaRole.id
    }
  });

  const user = await prisma.user.create({
    data: {
      username: USER_CREDENTIALS.username,
      email: 'user@test.local',
      fullName: 'Mahasiswa Test',
      nim: '2022101',
      phone: '081298765432',
      passwordHash: userHash,
      roleId: userRole.id
    }
  });

  const otherUser = await prisma.user.create({
    data: {
      username: OTHER_CREDENTIALS.username,
      email: 'other@test.local',
      fullName: 'Mahasiswa Lain',
      nim: '2022102',
      passwordHash: userHash,
      roleId: userRole.id
    }
  });

  const category = await prisma.category.create({
    data: { name: 'Kategori Test', description: 'Kategori untuk pengujian otomatis' }
  });

  const component = await prisma.component.create({
    data: {
      categoryId: category.id,
      name: 'Komponen Test',
      inventoryCode: 'TEST-001',
      stockTotal: 10,
      stockAvailable: 10,
      location: 'Lab Test'
    }
  });

  return { admin, dosen, mahasiswa, user, otherUser, category, component, roles: { adminRole, dosenRole, mahasiswaRole, userRole } };
};

export const disconnect = async () => {
  await prisma.$disconnect();
};
