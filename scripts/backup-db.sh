#!/usr/bin/env sh
# Backup do PostgreSQL via pg_dump.
#
# Uso:
#   ./scripts/backup-db.sh
#   DATABASE_URL=postgresql://user:pass@host:5432/db ./scripts/backup-db.sh
#   ./scripts/backup-db.sh /caminho/para/backup.sql
#
# Saida: backup-YYYYMMDD-HHMMSS.sql (ou arquivo informado)

set -e

OUTPUT="${1:-backup-$(date +%Y%m%d-%H%M%S).sql}"

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL nao definido. Usando padrao local."
  export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/financepro}"
fi

# Extrai host, port, user, password, dbname da URL
# Formato: postgresql://user:pass@host:port/dbname
eval "$(echo "$DATABASE_URL" | sed -n 's|postgresql://\([^:]*\):\([^@]*\)@\([^:]*\):\([0-9]*\)/\([^?]*\).*|PGUSER=\1; PGPASSWORD=\2; PGHOST=\3; PGPORT=\4; PGDATABASE=\5|p')"

if [ -z "$PGHOST" ]; then
  echo "ERRO: Nao foi possivel parsear DATABASE_URL" >&2
  exit 1
fi

echo "[backup] Fazendo backup de $PGDATABASE@$PGHOST:$PGPORT para $OUTPUT"
PGPASSWORD="$PGPASSWORD" pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -F p -f "$OUTPUT"

echo "[backup] OK - $(wc -c < "$OUTPUT") bytes"
