// 환경 변수 로딩 (가장 먼저 실행)
import './config/env.js';
import app from './app.js';
import { env } from './config/env.js';
import prisma from './config/database.js';

const PORT = parseInt(env.PORT, 10);

async function startServer() {
  try {
    // Prisma는 첫 쿼리에서 연결/파싱 에러가 나기 쉬워서 시작 단계에서 fail-fast 처리
    await prisma.$connect();
    console.log('✅ Database connection OK');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. 다른 프로세스가 사용 중입니다.`);
        console.error('💡 해결 방법:');
        console.error(`   - 기존 백엔드 프로세스를 종료하거나`);
        console.error(`   - backend/.env.development 에서 PORT를 다른 값으로 변경하세요.`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server due to database connection error.');
    console.error(error);
    process.exit(1);
  }
}

startServer();







