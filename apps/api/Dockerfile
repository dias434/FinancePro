# Build stage - contexto: raiz do repo (docker build -f apps/api/Dockerfile .)
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --dir apps/api exec prisma generate
RUN pnpm --dir apps/api build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/
COPY --from=builder /app/pnpm-workspace.yaml /app/
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
COPY --from=builder /app/apps/api/package.json /app/apps/api/
COPY --from=builder /app/apps/api/prisma /app/apps/api/prisma

USER nestjs

EXPOSE 3001

# Migracoes: rodar migrate.sh antes do start (ver scripts/migrate.sh)
CMD ["node", "apps/api/dist/main.js"]
