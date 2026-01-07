# 사내 미팅룸 예약 시스템

위키 달력으로 수동 예약하는 방식을 대체하는 사내용 미팅룸 예약 시스템 MVP입니다.

## 🛠️ Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM

### Frontend
- React + Vite + TypeScript
- TailwindCSS
- TanStack Query
- FullCalendar

## 📁 프로젝트 구조

```
meetingroom-system/
├── backend/
│   ├── src/
│   │   ├── routes/          # API 라우트 정의
│   │   ├── controllers/     # 요청/응답 핸들링
│   │   ├── services/        # 비즈니스 로직
│   │   ├── types/           # 타입 정의
│   │   ├── config/          # 설정 (DB 등)
│   │   ├── app.ts           # Express 앱 설정
│   │   └── server.ts        # 서버 시작
│   ├── prisma/
│   │   └── schema.prisma    # 데이터베이스 스키마
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # 페이지 컴포넌트
│   │   ├── components/      # 재사용 컴포넌트
│   │   ├── hooks/           # 커스텀 훅
│   │   ├── api/             # API 클라이언트
│   │   ├── layout/          # 레이아웃 컴포넌트
│   │   └── types/           # 타입 정의
│   └── package.json
└── package.json             # 루트 워크스페이스
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. 환경 변수 설정

#### 백엔드 환경 변수

1. `backend/.env.development` 파일 생성 (개발 환경용)
   ```bash
   cd backend
   # (리포에 .env* dotfile 예시는 포함하지 않습니다)
   # 아래 예시 파일을 복사해 ".env.development"로 이름을 바꿔 사용하세요.
   cp env.development.example .env.development
   ```

2. `.env.development` 파일을 열어 실제 값으로 수정:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/meetingroom_db?schema=public"
   PORT=3001
   FRONTEND_BASE_URL="http://localhost:3000"
   SSO_SITE_NAME="37AF0BE78AC74093A77E320F4CA451C4"
   # 개발 모드에서 자동 로그인할 사용자 사번 (선택사항)
   # 설정하지 않으면 첫 번째 ADMIN 계정 또는 첫 번째 사용자로 자동 로그인
   DEV_USER_EMPLOYEE_ID="E123458"
   ```

#### 프론트엔드 환경 변수

1. `frontend/.env.development` 파일 생성 (개발 환경용)
   ```bash
   cd frontend
   cp env.development.example .env.development
   ```

2. `.env.development` 파일 내용 (개발 환경에서는 Vite 프록시 사용):
   ```env
   VITE_API_BASE_URL=""
   ```

### 3. 데이터베이스 설정

1. PostgreSQL 데이터베이스 생성
2. Prisma 마이그레이션 실행

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 4. 개발 서버 실행

```bash
# 루트에서 (백엔드 + 프론트엔드 동시 실행)
npm run dev

# 또는 각각 실행
npm run dev:backend  # http://localhost:3001
npm run dev:frontend # http://localhost:3000
```

## 📊 데이터베이스 모델

### MeetingRoom (회의실)
- `id`: UUID (PK)
- `name`: 회의실 이름
- `location`: 위치
- `capacity`: 수용 인원
- `status`: ACTIVE / CLOSED
- `createdAt`, `updatedAt`

### Reservation (예약)
- `id`: UUID (PK)
- `roomId`: 회의실 ID (FK)
- `userId`: 사용자 ID
- `title`: 예약 제목
- `startAt`: 시작 시간
- `endAt`: 종료 시간
- `createdAt`, `updatedAt`

## 🔌 API 엔드포인트

### 회의실
- `GET /api/rooms` - 회의실 목록 조회
- `GET /api/rooms/:id` - 회의실 단건 조회

### 예약
- `GET /api/reservations?roomId=&date=` - 예약 목록 조회
- `GET /api/reservations/:id` - 예약 단건 조회
- `POST /api/reservations` - 예약 생성
- `PUT /api/reservations/:id` - 예약 수정
- `DELETE /api/reservations/:id` - 예약 삭제

## 📝 비즈니스 규칙

- 동일 회의실의 예약은 시간대가 겹치면 안 됨
- 예약은 `startAt < endAt` 이어야 함
- 예약 수정 시에도 동일한 중복 체크 필요
- 예약 삭제는 MVP에서는 제한하지 않음

## 🔐 SSO 인증 연동

### SSO 인증 흐름

1. **브라우저 → Express 서버** (`/api/*`)
   - 브라우저는 이미 SSO에 로그인된 상태이며, `JSESSIONID` 쿠키가 저장되어 있음
   - Express 서버는 Request Header의 Cookie에서 `JSESSIONID`를 추출

2. **Express → SSO API 호출**
   ```
   GET http://sso.eland.com/nsso-authweb/elandWebServices/elandUserAuth
   ?siteName=37AF0BE78AC74093A77E320F4CA451C4
   Headers: Cookie: JSESSIONID=xxxx
   ```

3. **SSO API 응답 처리**
   - XML 또는 JSON 형식으로 사용자 정보 반환
   - 필드: `employeeId`, `name`, `email`, `dept`

4. **User 테이블 저장/업데이트**
   - SSO 응답값을 기반으로 User 테이블에서 조회
   - 없으면 생성, 있으면 이름/부서 정보 업데이트

5. **req.user에 사용자 정보 저장**
   - 인증 성공 시 `req.user`에 사용자 정보 저장
   - 이후 모든 API 요청에서 `req.user`로 접근 가능

6. **프론트엔드에서 사용자 정보 조회**
   - `GET /api/me` 엔드포인트로 현재 로그인된 사용자 정보 조회
   - 헤더에 사용자 이름과 사번 표시

### 비인증 상태 진입 시 리다이렉트

- **페이지 진입** (`/`, `/app` 등)
  - 인증 실패 시 → `302 Redirect` → SSO 로그인 페이지
  - `https://sso.eland.com/eland-portal/login.do?returnURL=<우리 서비스 URL>`

- **API 호출** (`/api/**`)
  - 인증 실패 시 → `401 JSON` 응답
  - 프론트엔드에서 필요 시 SSO 로그인 페이지로 이동

### 로그아웃 플로우

1. **프론트엔드에서 로그아웃 버튼 클릭**
   - `POST /api/logout` 호출

2. **서버에서 SSO 로그아웃 URL 반환**
   ```json
   {
     "redirectUrl": "https://sso.eland.com/eland-portal/logout.do?returnURL=..."
   }
   ```

3. **SSO 로그아웃 페이지로 리다이렉트**
   - 사용자가 SSO 로그아웃 완료 후 `returnURL`로 돌아옴

4. **재인증 필요**
   - 로그아웃 후 `/api/me` 호출 시 `401` 응답
   - 자동으로 SSO 로그인 페이지로 리다이렉트

## 🔧 환경 설정 & 실행 방법

### 환경 분리 구조

이 프로젝트는 **개발/운영 환경을 분리**하여 관리합니다.

#### 백엔드 환경 파일

- **개발 환경**: `backend/.env.development`
  - 로컬 개발 시 사용
  - 실제 개발용 값 포함

- **운영 환경**: `backend/.env.production`
  - 운영 배포 시 사용
  - 실제 운영 값으로 교체 필요

#### 프론트엔드 환경 파일

- **개발 환경**: `frontend/.env.development`
  - Vite 개발 서버 실행 시 사용
  - `VITE_API_BASE_URL=""` (프록시 사용)

- **운영 환경**: `frontend/.env.production`
  - `vite build` 실행 시 사용
  - `VITE_API_BASE_URL="https://<PROD_API_DOMAIN>"` (실제 운영 URL)

### 환경 변수 자동 로딩

#### 백엔드

- `NODE_ENV=development` → `.env.development` 자동 로드
- `NODE_ENV=production` → `.env.production` 자동 로드
- `backend/src/config/env.ts`에서 중앙 관리

#### 프론트엔드

- `npm run dev` → `.env.development` 자동 로드
- `npm run build` → `.env.production` 자동 로드
- Vite 기본 규칙에 따라 자동 처리

### 환경 변수 목록

#### 백엔드 (`backend/.env.development`)

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 연결 URL | - |
| `PORT` | 서버 포트 | 3001 |
| `FRONTEND_BASE_URL` | 프론트엔드 기본 URL (CORS, 리다이렉트용) | http://localhost:3000 |
| `SSO_SITE_NAME` | SSO 사이트 이름 | 37AF0BE78AC74093A77E320F4CA451C4 |
| `DEV_USER_EMPLOYEE_ID` | 개발 모드에서 자동 로그인할 사용자 사번 (선택사항)<br/>설정하지 않으면 첫 번째 ADMIN 계정 또는 첫 번째 사용자로 자동 로그인 | - |

#### 프론트엔드 (`frontend/.env.development`)

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `VITE_API_BASE_URL` | API 베이스 URL | "" (프록시 사용) |

### 로컬 개발 실행 순서

```bash
# 1. 의존성 설치
npm install
cd backend && npm install
cd ../frontend && npm install

# 2. 환경 변수 파일 생성
# backend/.env.development
# frontend/.env.development
# (각 디렉토리의 .env.development.example 파일을 복사하여 생성)

# 3. 데이터베이스 설정
cd backend
npm run prisma:generate
npm run prisma:migrate

# 4. 백엔드 실행 (개발 모드)
npm run dev  # NODE_ENV=development 자동 설정

# 5. 프론트엔드 실행 (개발 모드)
cd ../frontend
npm run dev  # .env.development 자동 로드
```

### 운영 환경 배포

#### 백엔드

1. `backend/.env.production` 파일 생성 및 실제 값 입력
2. 빌드 및 실행:
   ```bash
   cd backend
   npm run build
   NODE_ENV=production npm start
   ```

#### 프론트엔드

1. `frontend/.env.production` 파일 생성 및 실제 API URL 입력
2. 빌드:
   ```bash
   cd frontend
   npm run build  # .env.production 자동 사용
   ```

### 로컬 개발 환경에서 테스트

1. **SSO 로그인 상태 확인**
   - 브라우저에서 `https://sso.eland.com`에 로그인
   - 개발자 도구에서 `JSESSIONID` 쿠키 확인

2. **로컬 서버 실행**
   ```bash
   cd backend
   npm run dev
   ```

3. **쿠키 전달 확인**
   - 프론트엔드에서 API 호출 시 `credentials: 'include'` 설정 확인
   - 브라우저가 자동으로 쿠키를 전달함

### 운영 환경 배포 시

1. **환경 변수 업데이트**
   - `FRONTEND_BASE_URL`: 운영 프론트엔드 URL
   - `SSO_SITE_NAME`: SSO 팀에서 제공받은 운영용 siteName

2. **CORS 설정 확인**
   - `backend/src/app.ts`에서 CORS origin 설정 확인

3. **쿠키 도메인 설정**
   - 필요 시 쿠키 도메인 설정 확인 (SSO와 동일 도메인인 경우)




