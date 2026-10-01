import prisma from '../utils/prisma';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export class AuthService {
  static async login(username: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
          { nim: username },
          { phone: username }
        ],
        deletedAt: null
      },
      include: { role: true }
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid username or password', code: 'INVALID_CREDENTIALS' };
    }

    if (!user.isActive) {
      throw { statusCode: 403, message: 'Account is deactivated. Please contact admin.', code: 'ACCOUNT_DEACTIVATED' };
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid username or password', code: 'INVALID_CREDENTIALS' };
    }

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role.name,
      fullName: user.fullName
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role.name,
        phone: user.phone,
        photoUrl: user.photoUrl
      }
    };
  }

  static async register(data: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
    roleName: 'Admin' | 'User';
  }) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }]
      }
    });

    if (existing) {
      throw { statusCode: 409, message: 'Email or username already exists', code: 'USER_EXISTS' };
    }

    let role = await prisma.role.findUnique({ where: { name: data.roleName } });
    if (!role) {
      role = await prisma.role.create({
        data: { name: data.roleName, description: `Role ${data.roleName}` }
      });
    }

    const passwordHash = await hashPassword(data.password);

    const newUser = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        username: data.username,
        passwordHash,
        phone: data.phone,
        roleId: role.id
      },
      include: { role: true }
    });

    return {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role.name
    };
  }

  static async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    const isMatch = await comparePassword(oldPass, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 400, message: 'Current password does not match', code: 'WRONG_PASSWORD' };
    }

    const newHash = await hashPassword(newPass);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    return { message: 'Password updated successfully' };
  }

  static async refreshToken(refreshToken: string) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true }
      });

      if (!user || !user.isActive) {
        throw { statusCode: 401, message: 'User not found or inactive', code: 'USER_INACTIVE' };
      }

      const payload = {
        userId: user.id,
        username: user.username,
        role: user.role.name,
        fullName: user.fullName
      };

      const newAccessToken = generateAccessToken(payload);
      return { accessToken: newAccessToken };
    } catch (err: any) {
      throw { statusCode: 401, message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' };
    }
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' };
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      phone: user.phone,
      photoUrl: user.photoUrl,
      role: user.role.name,
      createdAt: user.createdAt
    };
  }
}
