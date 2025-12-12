import axios from 'axios';

// 환경 변수에서 API 베이스 URL 가져오기
// 개발 환경: 빈 값 또는 /api (Vite 프록시 사용)
// 운영 환경: 실제 백엔드 API URL
const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// 개발 환경에서는 VITE_API_BASE_URL이 없거나 빈 문자열이면 /api 사용 (프록시)
// 운영 환경에서는 VITE_API_BASE_URL이 필수
const apiBaseUrl = envApiBaseUrl && envApiBaseUrl.trim() !== '' 
  ? envApiBaseUrl 
  : '/api';

// 디버깅용 로그 (개발 환경에서만)
if (import.meta.env.DEV) {
  console.log('🔧 API Base URL:', apiBaseUrl);
  console.log('🔧 VITE_API_BASE_URL:', envApiBaseUrl || '(not set)');
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키(JSESSIONID) 자동 전송
});

export default apiClient;




