# Modelo de domínio (v1)

## Princípios
- Guardar dinheiro como **inteiro em centavos** (`amountCents`) para evitar erros de float.
- Todos os registros têm `createdAt`, `updatedAt` e `deletedAt` (soft delete) para facilitar sync offline.
- Multiplataforma: o mesmo modelo vale para **mobile (SQLite local)** e **servidor (PostgreSQL)**.

## Entidades
### User
- `id`
- `email` (único)
- `passwordHash`
- `createdAt`, `updatedAt`

### Account
- `id`
- `userId`
- `name`
- `type`: `CASH | CHECKING | SAVINGS | CREDIT_CARD`
- `currency`: `BRL | USD | EUR | GBP` (v2 basico)
- `createdAt`, `updatedAt`, `deletedAt`

### Category
- `id`
- `userId`
- `name`
- `color` (opcional)
- `icon` (opcional)
- `createdAt`, `updatedAt`, `deletedAt`

### Transaction
- `id`
- `userId`
- `type`: `INCOME | EXPENSE | TRANSFER`
- `occurredAt` (data efetiva)
- `amountCents`
- `accountId`
- `categoryId` (opcional)
- `description` (opcional)
- `tags[]` (opcional)
- `costCenter` (opcional)
- `notes` (opcional)
- `transferAccountId` (somente quando `type=TRANSFER`)
- `createdAt`, `updatedAt`, `deletedAt`

### Budget (fase 4)
- `id`, `userId`
- `month` (YYYY-MM)
- `categoryId`
- `limitCents`
- `createdAt`, `updatedAt`, `deletedAt`

### Goal (fase 4)
- `id`, `userId`
- `name`
- `targetCents`
- `targetDate` (opcional)
- `createdAt`, `updatedAt`, `deletedAt`

## Prisma (rascunho)
> Implementação completa entra quando iniciarmos o backend (Nest + Prisma).

- `User` 1—N `Account`
- `User` 1—N `Category`
- `User` 1—N `Transaction`
- `Account` 1—N `Transaction`
- `Category` 1—N `Transaction`
