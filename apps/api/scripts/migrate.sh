#!/usr/bin/env sh
# Script de migracao para deploy.
# Executar ANTES de iniciar a API em ambientes de staging/producao.
#
# Uso:
#   ./scripts/migrate.sh
#   DATABASE_URL=postgresql://... ./scripts/migrate.sh
#
# Requer: prisma instalado (pnpm install) e DATABASE_URL no ambiente

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(cd "$API_DIR/../.." && pwd)"

cd "$ROOT_DIR"

if [ -z "$DATABASE_URL" ]; then
  echo "ERRO: DATABASE_URL nao definido" >&2
  exit 1
fi

echo "[migrate] Aplicando migrations..."
pnpm exec prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "[migrate] OK"
