# FinancePro Mobile (Expo)

## Requisitos
- Node + pnpm
- Expo Go (celular) **ou** Android Studio / Xcode

## Configurar API
Use `apps/mobile/.env.example` como base e crie um `.env` em `apps/mobile` com:

```
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_EAS_PROJECT_ID=seu-eas-project-id
```

`EXPO_PUBLIC_EAS_PROJECT_ID` e necessario para registrar o token de push do aparelho.

Sugestões:
- Android emulator: `http://10.0.2.2:3001`
- iOS simulator: `http://localhost:3001`
- Celular físico (mesma rede): `http://SEU_IP_LOCAL:3001`

## Rodar
Na raiz do repo:
- `pnpm -C apps/mobile start`

Depois:
- `a` para Android
- `i` para iOS

## Staging e release

- Build interno (staging): `eas build --platform all --profile preview`
- Build de producao: `eas build --platform all --profile production`
- Submissao Android: `eas submit --platform android --profile production`
- Submissao iOS: `eas submit --platform ios --profile production`

Perfis EAS: `apps/mobile/eas.json`

Guia operacional completo: `docs/mobile-go-live.md`
