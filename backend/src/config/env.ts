/**
 * 환경 변수 로딩 및 관리 모듈
 * NODE_ENV에 따라 .env.development 또는 .env.production을 로드합니다.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NODE_ENV 확인 (기본값: development)
const nodeEnv = process.env.NODE_ENV || 'development';

// 환경 파일 경로 결정
const envFile = nodeEnv === 'production' 
  ? '.env.production' 
  : '.env.development';

const envPath = path.resolve(__dirname, '../../', envFile);
const fallbackPath = path.resolve(__dirname, '../../', '.env');

// 환경 파일 로드
let result = dotenv.config({ path: envPath });
let loadedFile = envFile;

if (result.error) {
  console.warn(`⚠️  환경 파일 로드 실패: ${envFile}`);
  console.warn(`   경로: ${envPath}`);
  console.warn(`   에러: ${result.error.message}`);
  
  // 개발 모드에서는 기본 .env도 시도
  if (nodeEnv !== 'production') {
    const fallbackResult = dotenv.config({ path: fallbackPath, override: false });
    if (fallbackResult.error) {
      console.warn(`⚠️  기본 .env 파일도 찾을 수 없습니다.`);
      console.warn(`   경로: ${fallbackPath}`);
      console.warn(`   💡 해결 방법: backend/.env.development 파일을 생성하거나 기존 .env 파일을 확인하세요.`);
    } else {
      console.log(`ℹ️  기본 .env 파일을 사용합니다.`);
      result = fallbackResult; // fallback 성공 시 result 업데이트
      loadedFile = '.env';
    }
  }
} else {
  // 환경 파일은 로드되었지만 DATABASE_URL이 없을 수 있음
  // 개발 모드에서 DATABASE_URL이 없으면 .env도 시도
  if (nodeEnv !== 'production' && !process.env.DATABASE_URL) {
    console.warn(`⚠️  ${envFile}에 DATABASE_URL이 없습니다. 기본 .env 파일을 시도합니다.`);
    const fallbackResult = dotenv.config({ path: fallbackPath, override: false });
    if (!fallbackResult.error && process.env.DATABASE_URL) {
      console.log(`ℹ️  기본 .env 파일에서 DATABASE_URL을 사용합니다.`);
      loadedFile = '.env (fallback)';
    }
  } else {
    console.log(`✅ 환경 파일 로드 완료: ${envFile}`);
  }
}

// NODE_ENV가 설정되지 않은 경우 경고
if (!process.env.NODE_ENV) {
  console.warn('⚠️  NODE_ENV가 설정되지 않았습니다. 기본값(development)을 사용합니다.');
}

// 환경 변수 타입 정의 및 export
export const env = {
  NODE_ENV: nodeEnv,
  PORT: process.env.PORT || '3001',
  DATABASE_URL: process.env.DATABASE_URL || '',
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
  SSO_SITE_NAME: process.env.SSO_SITE_NAME || '37AF0BE78AC74093A77E320F4CA451C4',
  DEV_USER_EMPLOYEE_ID: process.env.DEV_USER_EMPLOYEE_ID || undefined,
} as const;

// 필수 환경 변수 검증
if (!env.DATABASE_URL) {
  console.error('❌ DATABASE_URL이 설정되지 않았습니다.');
  console.error('');
  console.error('💡 해결 방법:');
  console.error('   1. backend/.env.development 파일을 생성하세요.');
  console.error('   2. 또는 backend/.env 파일에 DATABASE_URL을 설정하세요.');
  console.error('');
  console.error('   예시:');
  console.error('   DATABASE_URL="postgresql://user:password@localhost:5432/meetingroom_db?schema=public"');
  console.error('');
  process.exit(1);
}

export default env;

