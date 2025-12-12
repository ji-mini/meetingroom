import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { parseString } from 'xml2js';
import { findOrCreateUser } from '../services/user.service.js';
import type { AuthenticatedUser, SSOUserInfo } from '../types/user.js';
import { env } from '../config/env.js';

// 개발 모드 사용자 정보 캐시 (로그 중복 방지)
let devUserCache: { user: AuthenticatedUser | null; errorLogged: boolean } | null = null;

// 운영 모드 사용자 정보 캐시 (사번 기준, 로그 중복 방지)
const prodUserCache = new Map<string, { user: AuthenticatedUser; logged: boolean }>();

/**
 * 개발 모드에서 사용자 정보를 가져오는 헬퍼 함수
 * 우선순위: 1) 환경 변수로 지정된 사용자, 2) 첫 번째 ADMIN, 3) 첫 번째 사용자
 */
async function getDevUser(): Promise<AuthenticatedUser | null> {
  // 캐시된 사용자가 있으면 바로 반환 (DB 조회 없음)
  if (devUserCache && devUserCache.user) {
    return devUserCache.user;
  }
  
  // 에러가 이미 로그되었으면 null 반환 (DB 조회 없음)
  if (devUserCache && devUserCache.errorLogged) {
    return null;
  }
  
  // 캐시가 없을 때만 DB 조회 수행
  console.log('[DEV] DB 조회 시작: 사용자 정보 조회');
  const prisma = (await import('../config/database.js')).default;
  const { getUserByEmployeeId } = await import('../services/user.service.js');
  
  // 1. 환경 변수로 지정된 사용자 ID가 있으면 해당 사용자 사용
  if (env.DEV_USER_EMPLOYEE_ID) {
    console.log(`[DEV] DB 조회: 환경 변수 사용자 조회 (${env.DEV_USER_EMPLOYEE_ID})`);
    const user = await getUserByEmployeeId(env.DEV_USER_EMPLOYEE_ID);
    console.log('[DEV] DB 조회 완료');
    if (user) {
      const authUser = {
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        dept: user.dept,
        company: user.company,
        role: user.role,
        department: user.department, // department 객체 추가
      } as AuthenticatedUser;
      
      devUserCache = { user: authUser, errorLogged: false };
      console.log(`[DEV] 로그인: ${user.name} (${user.employeeId}) - 환경 변수 사용`);
      return authUser;
    } else {
      console.warn(`[DEV] 환경 변수 사용자 ${env.DEV_USER_EMPLOYEE_ID}를 찾을 수 없습니다.`);
    }
  }
  
  // 2. 첫 번째 ADMIN 계정 사용
  console.log('[DEV] DB 조회: 첫 번째 ADMIN 계정 조회');
  const firstAdmin = await prisma.user.findFirst({
    where: { 
      role: 'ADMIN',
    },
    include: {
        department: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log('[DEV] DB 조회 완료');
  
  if (firstAdmin) {
    const authUser = {
      employeeId: firstAdmin.employeeId,
      name: firstAdmin.name,
      email: firstAdmin.email,
      dept: firstAdmin.dept,
      company: firstAdmin.company,
      role: firstAdmin.role,
      department: firstAdmin.department, // department 객체 추가
    } as AuthenticatedUser;
    
    devUserCache = { user: authUser, errorLogged: false };
    console.log(`[DEV] 로그인: ${firstAdmin.name} (${firstAdmin.employeeId}) - 첫 번째 ADMIN`);
    return authUser;
  }
  
  // 3. 첫 번째 사용자 사용
  console.log('[DEV] DB 조회: 첫 번째 사용자 조회');
  const firstUser = await prisma.user.findFirst({
    include: {
        department: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log('[DEV] DB 조회 완료');
  
  if (firstUser) {
    const authUser = {
      employeeId: firstUser.employeeId,
      name: firstUser.name,
      email: firstUser.email,
      dept: firstUser.dept,
      company: firstUser.company,
      role: firstUser.role,
      department: firstUser.department, // department 객체 추가
    } as AuthenticatedUser;
    
    devUserCache = { user: authUser, errorLogged: false };
    console.log(`[DEV] 로그인: ${firstUser.name} (${firstUser.employeeId}) - 첫 번째 사용자`);
    return authUser;
  }
  
  // 사용자를 찾지 못한 경우 에러 상태 캐시
  if (!devUserCache) {
    devUserCache = { user: null, errorLogged: false };
  }
  return null;
}

/**
 * 운영 모드에서 사용자 정보를 가져오는 헬퍼 함수 (SSO 정보 기반)
 * 캐싱을 통해 DB 조회 및 로그 중복 방지
 */
async function getProdUser(userInfo: SSOUserInfo): Promise<AuthenticatedUser> {
  const { employeeId } = userInfo;
  
  // 캐시된 사용자가 있으면 바로 반환 (DB 조회 없음)
  const cached = prodUserCache.get(employeeId);
  if (cached) {
    return cached.user;
  }
  
  // 캐시가 없을 때만 DB 조회 수행
  console.log(`[PROD] DB 조회 시작: 사용자 조회/생성 (${employeeId})`);
  const user = await findOrCreateUser(userInfo);
  console.log(`[PROD] DB 조회 완료: ${user.name} (${user.employeeId})`);
  
  const authUser = {
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    dept: user.dept,
    company: user.company,
    role: user.role,
    department: (user as any).department, // department 객체 추가 (user.service.ts의 findOrCreateUser는 include: {department:true}를 반환함)
  } as AuthenticatedUser;
  
  // 캐시에 저장 (로그는 첫 번째에만 출력)
  prodUserCache.set(employeeId, { user: authUser, logged: true });
  
  // 첫 번째 요청에만 로그 출력
  console.log(`[PROD] 로그인: ${user.name} (${user.employeeId})`);
  
  return authUser;
}

/**
 * SSO 인증 미들웨어
 * 
 * Request의 Cookie에서 JSESSIONID를 추출하여
 * SSO API를 호출하고 사용자 정보를 확인한 후
 * req.user에 사용자 정보를 저장합니다.
 */
export async function ssoMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production';
    
    // 쿠키에서 JSESSIONID 확인
    const cookies = req.headers.cookie || '';
    const jsessionIdMatch = cookies.match(/JSESSIONID=([^;]+)/);

    // 쿠키가 있으면 SSO API 호출하여 사용자 정보 가져오기
    if (jsessionIdMatch) {
      const jsessionId = jsessionIdMatch[1];
      const siteName = env.SSO_SITE_NAME;
      const ssoUrl = `http://sso.eland.com/nsso-authweb/elandWebServices/elandUserAuth?siteName=${siteName}`;

      try {
        // SSO API 호출 (개발/프로덕션 모두 시도)
        const ssoResponse = await axios.get(ssoUrl, {
          headers: {
            Cookie: `JSESSIONID=${jsessionId}`,
          },
          timeout: 5000,
        });

        // 개발 환경에서 SSO 응답 전체 로깅 (응답 구조 확인용)
        if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
          console.log('=== SSO API 응답 전체 ===');
          console.log('응답 타입:', typeof ssoResponse.data);
          console.log('응답 데이터:', JSON.stringify(ssoResponse.data, null, 2));
          console.log('응답 헤더:', JSON.stringify(ssoResponse.headers, null, 2));
          console.log('========================');
        }

        // 응답 파싱 (XML 또는 JSON)
        let userInfo: SSOUserInfo;

        if (typeof ssoResponse.data === 'string' && ssoResponse.data.trim().startsWith('<')) {
          // XML 응답인 경우
          const parsed = await new Promise<any>((resolve, reject) => {
            parseString(ssoResponse.data, (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });

          // 개발 환경에서 파싱된 XML 구조 로깅
          if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
            console.log('=== 파싱된 XML 구조 ===');
            console.log(JSON.stringify(parsed, null, 2));
            console.log('=====================');
          }

          // XML 구조에 따라 파싱 (실제 구조에 맞게 수정 필요)
          const response = parsed.response || parsed.elandUserAuth || parsed;
          userInfo = {
            employeeId: response.employeeId?.[0] || response.employeeId || '',
            name: response.name?.[0] || response.name || '',
            email: response.email?.[0] || response.email || null,
            dept: response.dept?.[0] || response.dept || null,
            company: response.company?.[0] || response.company || null,
          };
        } else {
          // JSON 응답인 경우
          const data = ssoResponse.data;
          
          // 개발 환경에서 JSON 구조 로깅
          if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
            console.log('=== JSON 응답 구조 ===');
            console.log('사용 가능한 필드:', Object.keys(data));
            console.log('전체 데이터:', JSON.stringify(data, null, 2));
            console.log('====================');
          }
          
          userInfo = {
            employeeId: data.employeeId || data.employee_id || '',
            name: data.name || data.userName || '',
            email: data.email || null,
            dept: data.dept || data.department || null,
            company: data.company || null,
          };
        }

        // 필수 필드 검증
        if (!userInfo.employeeId || !userInfo.name) {
          console.error('[PROD] SSO 응답에 필수 필드가 없습니다:', userInfo);
          return res.status(401).json({
            message: 'SSO 인증 정보가 올바르지 않습니다.',
          });
        }

        // User 테이블에 저장/업데이트 (캐싱 적용)
        const user = await getProdUser(userInfo);

        // req.user에 사용자 정보 저장 (user 테이블의 정보 사용)
        (req as any).user = user;

        return next();
      } catch (ssoError) {
        console.error('[SSO] SSO 인증 실패:', ssoError);
        
        // 개발 환경에서는 SSO 실패 시 DEV_USER_EMPLOYEE_ID로 폴백
        if (isDev) {
          console.log('[DEV] SSO 인증 실패, 개발 모드 사용자로 폴백');
          const devUser = await getDevUser();
          if (devUser) {
            (req as any).user = devUser;
            return next();
          }
          
          // 사용자가 아예 없으면 에러
          if (!devUserCache || !devUserCache.errorLogged) {
            console.error('[DEV] 데이터베이스에 사용자가 없습니다. 최소 한 명의 사용자를 생성해주세요.');
            if (!devUserCache) {
              devUserCache = { user: null, errorLogged: true };
            } else {
              devUserCache.errorLogged = true;
            }
          }
          return res.status(500).json({
            message: '개발 모드: 데이터베이스에 사용자가 없습니다. 최소 한 명의 사용자를 생성해주세요.',
          });
        }
        
        // 프로덕션에서는 SSO 인증 실패 시 에러 반환
        if (axios.isAxiosError(ssoError)) {
          if (ssoError.response?.status === 401 || ssoError.response?.status === 403) {
            return res.status(401).json({
              message: 'SSO 인증에 실패했습니다. 로그인이 필요합니다.',
            });
          }
        }
        return res.status(401).json({
          message: '인증 중 오류가 발생했습니다.',
          detail: ssoError instanceof Error ? ssoError.message : String(ssoError),
        });
      }
    }

    // 쿠키가 없는 경우
    // 개발 환경에서는 DEV_USER_EMPLOYEE_ID로 폴백
    if (isDev) {
      console.log('[DEV] JSESSIONID 쿠키 없음, 개발 모드 사용자로 폴백');
      const devUser = await getDevUser();
      if (devUser) {
        (req as any).user = devUser;
        return next();
      }
      
      // 사용자가 아예 없으면 에러
      if (!devUserCache || !devUserCache.errorLogged) {
        console.error('[DEV] 데이터베이스에 사용자가 없습니다. 최소 한 명의 사용자를 생성해주세요.');
        if (!devUserCache) {
          devUserCache = { user: null, errorLogged: true };
        } else {
          devUserCache.errorLogged = true;
        }
      }
      return res.status(500).json({
        message: '개발 모드: 데이터베이스에 사용자가 없습니다. 최소 한 명의 사용자를 생성해주세요.',
      });
    }

    // 프로덕션 환경에서 쿠키가 없으면 에러 반환
    return res.status(401).json({
      message: '인증이 필요합니다. SSO 로그인이 필요합니다.',
    });
  } catch (error) {
    console.error('SSO 인증 실패:', error);
    
    // 개발 모드에서는 에러가 발생해도 데이터베이스의 사용자로 처리
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production';
    if (isDev) {
      try {
        const devUser = await getDevUser();
        if (devUser) {
          (req as any).user = devUser;
          return next();
        }
      } catch (fallbackError) {
        console.error('[DEV] 사용자 조회 실패:', fallbackError);
      }
    }
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return res.status(401).json({
          message: 'SSO 인증에 실패했습니다. 로그인이 필요합니다.',
        });
      }
    }

    return res.status(401).json({
      message: '인증 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
