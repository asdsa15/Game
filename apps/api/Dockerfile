# Node 22：靠内置的 type stripping 直接跑 .ts，不需要 tsc 产物
FROM node:22-alpine

WORKDIR /app

# 先装依赖，利用层缓存
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY db ./db
COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 8787

# 非 root 运行
USER node

CMD ["node", "src/server.ts"]
