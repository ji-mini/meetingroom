FROM node:22-alpine AS build

WORKDIR /app
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run prisma:generate
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3001

CMD ["sh", "-lc", "npx prisma migrate deploy && node dist/server.js"]

