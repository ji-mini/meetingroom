// 환경 변수 로딩 (가장 먼저 실행)
import './config/env.js';
import app from './app.js';
import { env } from './config/env.js';

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});







