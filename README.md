# FinancePro

Monorepo do FinancePro, uma plataforma de controle financeiro pessoal com API, aplicativo mobile em Expo/React Native e aplicacao web.

## Estrutura

- `apps/api`: backend em NestJS + Prisma + PostgreSQL
- `apps/mobile`: app mobile em Expo / React Native
- `apps/web`: frontend web
- `docs`: guias operacionais, deploy e go-live

## Requisitos

- Node.js
- pnpm
- PostgreSQL para a API
- Expo / Android Studio / iOS Simulator para o mobile

## Configuracao

Use os arquivos de exemplo como base:

- `./.env.example`
- `./apps/mobile/.env.example`

O mobile local em celular fisico precisa que `EXPO_PUBLIC_API_URL` aponte para o IP da maquina na rede local.

## Rodando localmente

Na raiz do projeto:

```bash
pnpm dev:api
```

Em outro terminal:

```bash
pnpm dev:mobile
```

Para a aplicacao web:

```bash
pnpm dev:web
```

## Scripts uteis

```bash
pnpm test:api:unit
pnpm test:mobile:smoke
pnpm build
```

## Mobile / EAS

O app mobile ja esta configurado para EAS Build e EAS Update.

- Dev build: `pnpm dlx eas-cli build --platform android --profile development`
- Staging: `pnpm dlx eas-cli build --platform all --profile preview`
- Producao: `pnpm dlx eas-cli build --platform all --profile production`

Para push notifications em producao, ainda e necessario configurar:

- Android: FCM no Expo/EAS
- iOS: APNs / Apple Developer no Expo/EAS

## Documentacao

- `docs/mobile-go-live.md`
- `docs/deploy-rollback.md`
- `docs/offline-sync.md`

## Licenca

Uso privado.
