import { Router } from 'express';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../types/user.js';
import { env } from '../config/env.js';
import axios from 'axios';
import { parseString } from 'xml2js';

const router = Router();

/**
 * 현재 로그인된 사용자 정보 조회
 * GET /api/me
 */
router.get('/me', (req: Request, res: Response) => {
  const user = (req as any).user as AuthenticatedUser | undefined;

  if (!user) {
    return res.status(401).json({
      message: '인증이 필요합니다.',
    });
  }

  // user 객체에 department 정보가 join 되어 있다고 가정
  const departmentName = (user as any).department?.name || null;

  res.json({
    employeeId: user.employeeId,
    name: user.name,
    email: user.email || null,
    dept: user.dept || null, // 원래대로 user.dept(부서ID) 반환
    departmentName: departmentName, // 부서명 별도 필드로 반환
    company: user.company || null,
    role: user.role,
  });
});

/**
 * 로그아웃
 * POST /api/logout
 * SSO 로그아웃 URL을 반환합니다.
 */
router.post('/logout', (req: Request, res: Response) => {
  const frontendBaseUrl = env.FRONTEND_BASE_URL;
  const returnUrl = encodeURIComponent(frontendBaseUrl);
  const logoutUrl = `https://sso.eland.com/eland-portal/logout.do?returnURL=${returnUrl}`;

  res.json({
    redirectUrl: logoutUrl,
  });
});

/**
 * SSO 응답 테스트 (개발 환경 전용)
 * GET /api/auth/test-sso
 * 쿠키의 JSESSIONID를 사용하여 SSO API 응답을 확인합니다.
 */
router.get('/test-sso', async (req: Request, res: Response) => {
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production';
  
  if (!isDev) {
    return res.status(403).json({
      message: '이 엔드포인트는 개발 환경에서만 사용할 수 있습니다.',
    });
  }

  const cookies = req.headers.cookie || '';
  const jsessionIdMatch = cookies.match(/JSESSIONID=([^;]+)/);

  if (!jsessionIdMatch) {
    return res.status(400).json({
      message: 'JSESSIONID 쿠키가 없습니다. SSO 로그인 후 다시 시도해주세요.',
    });
  }

  const jsessionId = jsessionIdMatch[1];
  const siteName = env.SSO_SITE_NAME;
  const ssoUrl = `http://sso.eland.com/nsso-authweb/elandWebServices/elandUserAuth?siteName=${siteName}`;

  try {
    console.log('=== SSO API 테스트 호출 ===');
    console.log('URL:', ssoUrl);
    console.log('JSESSIONID:', jsessionId.substring(0, 20) + '...');
    
    const ssoResponse = await axios.get(ssoUrl, {
      headers: {
        Cookie: `JSESSIONID=${jsessionId}`,
      },
      timeout: 5000,
    });

    const responseData = {
      status: ssoResponse.status,
      statusText: ssoResponse.statusText,
      headers: ssoResponse.headers,
      dataType: typeof ssoResponse.data,
      data: ssoResponse.data,
    };

    // XML인 경우 파싱도 시도
    if (typeof ssoResponse.data === 'string' && ssoResponse.data.trim().startsWith('<')) {
      try {
        const parsed = await new Promise<any>((resolve, reject) => {
          parseString(ssoResponse.data, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        responseData.data = {
          raw: ssoResponse.data,
          parsed: parsed,
        };
      } catch (parseError) {
        responseData.data = {
          raw: ssoResponse.data,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        };
      }
    }

    console.log('=== SSO API 응답 ===');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('===================');

    res.json({
      message: 'SSO API 응답을 확인했습니다. 백엔드 콘솔과 응답 본문을 확인하세요.',
      response: responseData,
    });
  } catch (error) {
    console.error('=== SSO API 호출 실패 ===');
    console.error(error);
    console.error('======================');

    res.status(500).json({
      message: 'SSO API 호출 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : String(error),
      detail: axios.isAxiosError(error) ? {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      } : undefined,
    });
  }
});

export default router;
