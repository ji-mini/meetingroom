import express from 'express';
import cors from 'cors';
import { ssoMiddleware } from './middleware/ssoMiddleware.js';
import { optionalAuthMiddleware } from './middleware/optionalAuth.js';
import roomRoutes from './routes/room.routes.js';
import reservationRoutes from './routes/reservation.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import { env } from './config/env.js';

const app = express();

app.use(cors({
  origin: env.FRONTEND_BASE_URL,
  credentials: true,
}));
app.use(express.json());

// 1. 조회 API: optionalAuthMiddleware 적용 (GET 요청)
// app.use로 라우터를 등록할 때 조건부 미들웨어를 사용하므로 여기서는 제거
// app.get('/api/rooms', optionalAuthMiddleware);
// app.get('/api/reservations', optionalAuthMiddleware);

// 2. 인증 관련 API: ssoMiddleware 적용
// app.use('/api/auth', ssoMiddleware);
// app.use('/api/auth', authRoutes);
// -> 아래에서 통합 등록함

// 3. 관리자/쓰기 API: ssoMiddleware 적용
// POST, PUT, DELETE 요청에만 ssoMiddleware가 적용되어야 함
// 하지만 app.use로 등록하면 해당 경로의 모든 요청에 적용되므로,
// 라우터 레벨이나 메서드 레벨에서 처리하는 것이 안전함.

// API 라우트 등록 (미들웨어는 각 라우트 파일 내부에서 적용하거나, 여기서 조건부 적용)

// 1. 인증 라우트 (항상 인증 필요)
app.use('/api/auth', ssoMiddleware, authRoutes);
app.use('/api/users', ssoMiddleware, userRoutes);

// 2. 룸 라우트 (GET은 인증 선택, 나머지는 인증 필수)
app.use('/api/rooms', (req, res, next) => {
  if (req.method === 'GET') {
    return optionalAuthMiddleware(req, res, next);
  }
  return ssoMiddleware(req, res, next);
}, roomRoutes);

// 3. 예약 라우트 (GET은 인증 선택, 나머지는 인증 필수)
app.use('/api/reservations', (req, res, next) => {
  if (req.method === 'GET') {
    return optionalAuthMiddleware(req, res, next);
  }
  return ssoMiddleware(req, res, next);
}, reservationRoutes);



// 비인증 상태에서 페이지 진입 시 SSO 로그인 페이지로 리다이렉트
app.get('/', (req, res) => {
  const returnUrl = encodeURIComponent(env.FRONTEND_BASE_URL);
  const loginUrl = `https://sso.eland.com/eland-portal/login.do?returnURL=${returnUrl}`;
  res.redirect(loginUrl);
});

app.get('/app', (req, res) => {
  const returnUrl = encodeURIComponent(env.FRONTEND_BASE_URL);
  const loginUrl = `https://sso.eland.com/eland-portal/login.do?returnURL=${returnUrl}`;
  res.redirect(loginUrl);
});

// Health check (인증 불필요)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;




