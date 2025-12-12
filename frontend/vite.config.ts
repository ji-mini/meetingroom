import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // 모든 네트워크 인터페이스에서 리스닝 (IPv4 + IPv6)
    port: 3000, // 브라우저에서 보는 포트
    strictPort: false, // 포트가 사용 중이면 다른 포트 사용
    open: false, // 자동 브라우저 열기 비활성화
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // 백엔드 서버 주소
        changeOrigin: true,
        secure: false,  // 프록시 대상(target)이 HTTPS인 경우, 인증서(SSL) 검증을 하지 않겠다.
      },
    },
  },
});


