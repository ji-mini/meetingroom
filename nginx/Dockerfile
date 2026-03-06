FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine

# 정적 파일(dist)
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# 설정은 docker-compose에서 bind mount로 주입하는 것을 기본으로 하지만,
# 이미지 단독 실행도 가능하도록 기본 설정도 함께 넣어둠
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

