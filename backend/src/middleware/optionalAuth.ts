import type { Request, Response, NextFunction } from 'express';

/**
 * 선택적 인증 미들웨어 (SSO API 호출 없음)
 * 
 * 조회 API에서 사용하며, 인증 없이도 접근 가능합니다.
 * SSO API는 호출하지 않고, 단순히 다음 미들웨어로 진행합니다.
 * (로그인 버튼 클릭 후 /api/auth/me에서만 SSO API 호출)
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // SSO API 호출 없이 바로 다음 미들웨어로 진행
  // 조회 API는 인증 없이도 접근 가능
  return next();
}

