/**
 * 환경 변수 로딩 및 관리 모듈
 * NODE_ENV에 따라 .env.development 또는 .env.production을 로드합니다.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 값 정규화: 따옴표/세미콜론/공백 등으로 인해 파서가 깨지는 케이스를 완화합니다.
 */
function normalizeEnvValue(value: string): string {
  let v = value.trim();

  // dotenv가 따옴표를 포함해 읽어오는 경우가 있어 제거
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }

  // Windows에서 복사/붙여넣기 시 세미콜론이 붙는 경우가 있어 제거
  if (v.endsWith(';')) v = v.slice(0, -1).trim();

  return v;
}

/**
 * DATABASE_URL이 올바른 URL 형태인지(특히 port) 검증합니다.
 * - 성공: 파싱된 URL 반환
 * - 실패: null
 */
function tryParseDatabaseUrl(databaseUrl: string): URL | null {
  try {
    const url = new URL(databaseUrl);
    if (!url.protocol.startsWith('postgres')) return null;

    // 빈 포트는 허용(예: default)하되, 값이 있다면 숫자여야 함
    if (url.port && !/^\d+$/.test(url.port)) return null;
    return url;
  } catch {
    return null;
  }
}

function redactDatabaseUrl(databaseUrl: string): string {
  const parsed = tryParseDatabaseUrl(databaseUrl);
  if (!parsed) return '(invalid DATABASE_URL)';

  // userinfo 제거 (비밀번호 노출 방지)
  const hostPart = parsed.host; // hostname:port
  return `${parsed.protocol}//***:***@${hostPart}${parsed.pathname}${parsed.search}`;
}

function loadFallbackEnvIfNeeded(reason: string) {
  const fallbackPath = path.resolve(__dirname, '../../', '.env');
  if (!fs.existsSync(fallbackPath)) return;

  try {
    const raw = fs.readFileSync(fallbackPath, 'utf8');
    const parsed = dotenv.parse(raw);
    const fallbackDbUrl = parsed.DATABASE_URL ? normalizeEnvValue(parsed.DATABASE_URL) : '';
    if (!fallbackDbUrl) return;

    // 기존 값이 없거나(미설정) 유효하지 않을 때만 fallback 적용
    const currentDbUrl = process.env.DATABASE_URL ? normalizeEnvValue(process.env.DATABASE_URL) : '';
    const currentParsed = currentDbUrl ? tryParseDatabaseUrl(currentDbUrl) : null;
    const fallbackParsed = tryParseDatabaseUrl(fallbackDbUrl);

    if (!fallbackParsed) return;
    if (!currentDbUrl || !currentParsed) {
      process.env.DATABASE_URL = fallbackDbUrl;
      console.log(`ℹ️  ${reason} → 기본 .env의 DATABASE_URL로 대체합니다.`);
    }
  } catch {
    // fallback은 best-effort
  }
}

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

// DATABASE_URL 정규화 + (개발 환경) 유효하지 않으면 .env fallback 시도
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = normalizeEnvValue(process.env.DATABASE_URL);
}
if (nodeEnv !== 'production') {
  const parsed = process.env.DATABASE_URL
    ? tryParseDatabaseUrl(process.env.DATABASE_URL)
    : null;
  if (!parsed) {
    loadFallbackEnvIfNeeded(`${loadedFile}의 DATABASE_URL이 유효하지 않습니다.`);
  }
}

// 환경 변수 타입 정의 및 export
export const env = {
  NODE_ENV: nodeEnv,
  PORT: process.env.PORT || '3001',
  DATABASE_URL: process.env.DATABASE_URL ? normalizeEnvValue(process.env.DATABASE_URL) : '',
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

// DATABASE_URL 형식 검증 (port 포함). 비밀번호 노출 방지 위해 redacted 값만 출력
const parsedDbUrl = tryParseDatabaseUrl(env.DATABASE_URL);
if (!parsedDbUrl) {
  console.error('❌ DATABASE_URL 형식이 올바르지 않습니다. (특히 port 숫자 여부 확인)');
  console.error('');
  console.error(`   현재 값(마스킹): ${redactDatabaseUrl(env.DATABASE_URL)}`);
  console.error('');
  console.error('💡 해결 방법:');
  console.error('   - backend/.env.development 의 DATABASE_URL에서 포트가 숫자만 포함하는지 확인하세요.');
  console.error('   - 예: DATABASE_URL="postgresql://user:password@localhost:5432/meetingroom_db?schema=public"');
  console.error('');
  process.exit(1);
}

// 개발 환경에서는 어떤 DB로 붙는지(host/dbname)만 출력해서 환경 불일치 디버깅을 돕습니다.
if (nodeEnv !== 'production') {
  const portPart = parsedDbUrl.port ? `:${parsedDbUrl.port}` : '';
  console.log(
    `ℹ️  DB Target: ${parsedDbUrl.hostname}${portPart}${parsedDbUrl.pathname}`
  );
}

export default env;

