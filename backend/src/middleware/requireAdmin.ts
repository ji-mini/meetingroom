import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from '../types/user.js';

/**
 * 관리자 권한이 필요한 API에 사용하는 미들웨어
 * req.user가 ADMIN role을 가져야 함
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthenticatedUser | undefined;

  if (!user) {
    return res.status(401).json({
      message: '인증이 필요합니다.',
    });
  }

  if (user.role !== 'ADMIN') {
    return res.status(403).json({
      message: '관리자 권한이 필요합니다.',
    });
  }

  next();
}















