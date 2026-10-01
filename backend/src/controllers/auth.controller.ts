import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema, registerSchema, changePasswordSchema, refreshTokenSchema } from '../validators/auth.validator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated.username, validated.password);
      return sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);
      return sendSuccess(res, result, 'User registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.getProfile(req.user!.userId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = changePasswordSchema.parse(req.body);
      const result = await AuthService.changePassword(req.user!.userId, validated.oldPassword, validated.newPassword);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = refreshTokenSchema.parse(req.body);
      const result = await AuthService.refreshToken(validated.refreshToken);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response) {
    return sendSuccess(res, null, 'Logged out successfully');
  }
}
