# Setup (dev)

## Requisitos
- Node.js (recomendado: 22+)
- pnpm
- Docker (para Postgres)

## 1) Instalar deps
```bash
pnpm install
```

## 2) Subir Postgres
```bash
docker compose up -d
```

## 3) Configurar env
- Copie `apps/api/.env.example` para `apps/api/.env`
- Copie `apps/web/.env.example` para `apps/web/.env`

## 4) Prisma (migrations)
```bash
pnpm -C apps/api prisma:migrate
```

## 5) Rodar backend
```bash
pnpm -C apps/api dev
```

## 6) Rodar frontend
```bash
pnpm -C apps/web dev
```
## 7) Rodar os dois
pnpm -r --parallel dev

