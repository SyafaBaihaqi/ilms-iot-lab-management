import prisma from '../utils/prisma';
import { hashPassword } from '../utils/jwt';
import { RoleName } from '../constants/roles';

export class UserService {
  static async getAll(options: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (options.search) {
      where.OR = [
        { fullName: { contains: options.search, mode: 'insensitive' } },
        { username: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { nim: { contains: options.search, mode: 'insensitive' } }
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          username: true,
          nim: true,
          phone: true,
          isActive: true,
          createdAt: true,
          role: { select: { name: true } }
        }
      })
    ]);

    return {
      items: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async create(data: { fullName: string; email: string; username: string; password: string; nim?: string | null; phone?: string; roleName: RoleName }) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username },
          ...(data.nim ? [{ nim: data.nim }] : [])
        ]
      }
    });
    if (existing) {
      throw { statusCode: 409, message: 'Email, username, or NIM already exists', code: 'USER_EXISTS' };
    }

    const role = await prisma.role.findUnique({ where: { name: data.roleName } });
    if (!role) {
      throw { statusCode: 400, message: 'Invalid role name', code: 'INVALID_ROLE' };
    }

    const passwordHash = await hashPassword(data.password);
    return prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        username: data.username,
        passwordHash,
        nim: data.nim || null,
        phone: data.phone,
        roleId: role.id
      },
      include: { role: true }
    });
  }

  static async update(id: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    // NIM harus unik; dicegah sebelum update agar pesan errornya jelas.
    if (data.nim !== undefined) {
      const nim = data.nim || null;
      if (nim && nim !== user.nim) {
        const duplicate = await prisma.user.findFirst({ where: { nim, NOT: { id } } });
        if (duplicate) {
          throw { statusCode: 409, message: 'NIM already exists', code: 'USER_EXISTS' };
        }
      }
      data.nim = nim;
    }

    if (data.roleName) {
      const role = await prisma.role.findUnique({ where: { name: data.roleName } });
      if (!role) {
        throw { statusCode: 400, message: 'Invalid role name', code: 'INVALID_ROLE' };
      }
      data.roleId = role.id;
      delete data.roleName;
    }

    if (data.password) {
      data.passwordHash = await hashPassword(data.password);
      delete data.password;
    }

    return prisma.user.update({
      where: { id },
      data,
      include: { role: true }
    });
  }

  static async softDelete(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' };
    }
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    });
  }
}