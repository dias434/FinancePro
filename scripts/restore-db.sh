#!/usr/bin/env sh
# Restore do PostgreSQL via psql.
#
# Uso:
#   ./scripts/restore-db.sh backup.sql
#   DATABASE_URL=postgresql://... ./scripts/restore-db.sh backup.sql
#
# ATENCAO: Sobrescreve o banco. Fazer backup antes se necessario.

set -e

if [ -z "$1" ]; then
  echo "Uso: $0 <arquivo-backup.sql>" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERRO: Arquivo nao encontrado: $BACKUP_FILE" >&2
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL nao definido. Usando padrao local."
  export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/financepro}"
fi

eval "$(echo "$DATABASE_URL" | sed -n 's|postgresql://\([^:]*\):\([^@]*\)@\([^:]*\):\([0-9]*\)/\([^?]*\).*|PGUSER=\1; PGPASSWORD=\2; PGHOST=\3; PGPORT=\4; PGDATABASE=\5|p')"

if [ -z "$PGHOST" ]; then
  echo "ERRO: Nao foi possivel parsear DATABASE_URL" >&2
  exit 1
fi

echo "[restore] Restaurando $BACKUP_FILE em $PGDATABASE@$PGHOST"
echo "          (o banco sera sobrescrito)"

if [ "$2" != "--yes" ] && [ -z "$RESTORE_SKIP_CONFIRM" ]; then
  printf "Continuar? [y/N] "
  read -r resp
  case "$resp" in
    [yY][eE][sS]|[yY]) ;;
    *) echo "Cancelado."; exit 0 ;;
  esac
fi

PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$BACKUP_FILE"

echo "[restore] OK"
