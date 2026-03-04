# Offline + Sync (resumo)

## Objetivo
Permitir usar o app **offline** (criar/editar transações, contas, categorias) e sincronizar com o servidor quando voltar a ter internet, com regras claras para conflitos.

## Armazenamento local
- Mobile: **SQLite** (tabelas espelhadas do servidor + uma tabela de fila).
- Web (se usar): **IndexedDB** (mesmo conceito).

## Padrão “outbox”
Manter uma tabela/fila local de operações pendentes (outbox), por exemplo:
- `id`
- `entity` (Account/Category/Transaction)
- `entityId`
- `op` (`upsert` | `delete`)
- `payload` (JSON mínimo)
- `createdAt`
- `status` (`pending` | `sent` | `failed`)
- `retryCount`

## Sync (alto nível)
1) **Push:** enviar eventos da outbox (em ordem) para o backend.
2) **Pull:** baixar mudanças do servidor desde `lastSyncAt`.
3) Atualizar `lastSyncAt` local.

## Conflitos
Versão v1 (simples):
- Regra “last write wins” usando `updatedAt`.
- Empate: desempate por `deviceId` (string) para ser determinístico.

Versão v2 (melhor):
- Conflito por campo (ex: descrição vs categoria).
- Merge assistido para casos raros.

