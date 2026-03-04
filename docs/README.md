# FinancePro (docs)

O FinancePro é um app de controle financeiro pessoal/familiar com **Web (Next.js)**, **Mobile (Expo/React Native)** e **API (NestJS)**.

Para status/roadmap por fase, veja `docs/todo.md`.
Para go-live do mobile, veja `docs/mobile-go-live.md`.

## Visão geral

- **Web (`apps/web`)**: interface principal no navegador (login/cadastro, dashboard).
- **Mobile (`apps/mobile`)**: app Expo/React Native com login/cadastro e dashboard.
- **API (`apps/api`)**: API NestJS + Prisma, persistindo em **PostgreSQL** (`docker-compose.yml`).

## Arquitetura do projeto

Monorepo com **pnpm workspaces**:

- `apps/api`: NestJS (TypeScript) + Prisma
  - Auth: JWT (access) + refresh token opaco com **rotação** (hash no banco).
  - Documentação: `GET /docs` e `GET /openapi.json`.
- `apps/web`: Next.js (App Router)
  - As rotas `app/api/*` fazem o “BFF”: conversam com a API e salvam tokens em **cookies httpOnly**.
  - `middleware.ts` protege rotas autenticadas.
- `apps/mobile`: Expo/React Native
  - Consome a API diretamente e guarda tokens localmente (ex.: Secure Store).
- `docs`: documentação e notas do projeto.

Fluxo (alto nível):

- Web: `Browser -> Next (route handlers) -> API Nest -> Postgres`
- Mobile: `App -> API Nest -> Postgres`

## Requisitos

- Node.js (recomendado: 22+)
- pnpm
- Docker (para Postgres)

## Rodando localmente (dev)

1) Instalar dependências (na raiz):
```bash
pnpm install
```

2) Subir Postgres:
```bash
docker compose up -d
```

3) Configurar variáveis de ambiente:
- Copie `apps/api/.env.example` para `apps/api/.env`
- Copie `apps/web/.env.example` para `apps/web/.env`
- (Mobile) Copie `apps/mobile/.env.example` para `apps/mobile/.env` (ou ajuste no Metro/Expo)
- O backend aplica CORS restrito por ambiente com:
  - `CORS_ORIGINS_DEV`, `CORS_ORIGINS_STAGING`, `CORS_ORIGINS_PROD`
  - `CORS_ORIGIN` (override opcional/legado)
- O backend inclui rate limit configurável por IP/usuário via:
  - `RATE_LIMIT_IP_WINDOW_MS`, `RATE_LIMIT_IP_MAX_REQUESTS`
  - `RATE_LIMIT_USER_WINDOW_MS`, `RATE_LIMIT_USER_MAX_REQUESTS`
  - `RATE_LIMIT_AUTH_IP_WINDOW_MS`, `RATE_LIMIT_AUTH_IP_MAX_REQUESTS`
- Upload/import usa timeout configurável via `IMPORT_PROCESSING_TIMEOUT_MS`.

Observação: o `docker-compose.yml` sobe Postgres com `postgres/postgres` (user/senha). Ajuste o `DATABASE_URL` conforme seu ambiente.

4) Rodar migrations do Prisma:
```bash
pnpm -C apps/api prisma:migrate
```

5) Rodar a API:
```bash
pnpm dev:api
```

6) Rodar o Web:
```bash
pnpm dev:web
```

7) Rodar o Mobile:
```bash
pnpm dev:mobile
```

## Comandos úteis

Na raiz:

- Dev (atalhos):
  - `pnpm dev:api`
  - `pnpm dev:web`
  - `pnpm dev:mobile`
- Build:
  - `pnpm -C apps/api build`
  - `pnpm -C apps/web build`
- Lint:
  - `pnpm -C apps/web lint`
- Smoke tests:
  - `pnpm test:mobile:smoke`
  - `pnpm test:api:smoke` (requer API rodando em `http://localhost:3001`)
- Backend unit/e2e:
  - `pnpm test:api:unit`
  - `pnpm test:api:coverage:gate` (falha se cobertura de linhas < 70%)
  - `pnpm test:api:e2e` (requer API rodando em `http://localhost:3001`)

## Gate de cobertura e merge

- Workflow: `.github/workflows/api-coverage-gate.yml`
- Check de cobertura: `pnpm test:api:coverage:gate`
- Para bloquear merge abaixo da meta, marque o check `api-tests-and-coverage` como required status check na branch protegida.

## Endpoints importantes

- Health: `GET http://localhost:3001/health`
- Swagger UI: `GET http://localhost:3001/docs`
- OpenAPI JSON: `GET http://localhost:3001/openapi.json`

Auth (API):
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me` (Bearer)

## Troubleshooting

- **Prisma CLI pedindo download de engines**: na primeira execução o Prisma pode baixar binários. Garanta acesso à internet (ou rode em um ambiente com cache/engines disponíveis).
- **`next build` falhando com `EPERM` no Windows**: normalmente é arquivo travado em `.next`.
  - Pare processos do Node que estejam usando `apps/web/.next`
  - Apague `apps/web/.next` e rode o build novamente.
