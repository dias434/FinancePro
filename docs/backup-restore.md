# Backup e Restore - PostgreSQL

## Estrategia

- **Backup**: `pg_dump` em formato plain SQL (restauravel em qualquer versao)
- **Frequencia**: diario (cron) em prod; antes de cada deploy
- **Retencao**: 7 dias minimo em prod
- **Teste**: restaurar em ambiente staging mensalmente

## Scripts

### Backup

```bash
# Usando DATABASE_URL do .env ou ambiente
./scripts/backup-db.sh

# Saida em arquivo especifico
./scripts/backup-db.sh /var/backups/financepro-$(date +%Y%m%d).sql

# Com URL explicita
DATABASE_URL=postgresql://user:pass@host:5432/financepro ./scripts/backup-db.sh
```

Requer: `pg_dump` instalado (pacote `postgresql-client` no Linux).

### Restore

```bash
./scripts/restore-db.sh backup-20260303-120000.sql

# Restore sem confirmacao (CI/automacao)
./scripts/restore-db.sh backup.sql --yes
RESTORE_SKIP_CONFIRM=1 ./scripts/restore-db.sh backup.sql
```

Requer: `psql` instalado.

## Teste de backup/restore

1. Subir o banco local:
   ```bash
   docker compose up -d db
   ```

2. Aplicar migrations e popular dados de teste:
   ```bash
   cd apps/api && pnpm prisma migrate deploy
   # (opcional) seed ou uso normal do app
   ```

3. Fazer backup:
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/financepro ./scripts/backup-db.sh test-backup.sql
   ```

4. Dropar e recriar o banco (ou usar outro banco):
   ```bash
   docker compose down -v
   docker compose up -d db
   sleep 3
   # Criar banco se nao existir
   PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE financepro;"
   ```

5. Restaurar:
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/financepro ./scripts/restore-db.sh test-backup.sql --yes
   ```

6. Validar: iniciar API e testar health, login, transacoes.

## Automatizacao (cron)

Exemplo para backup diario as 2h:

```cron
0 2 * * * cd /opt/financepro && ./scripts/backup-db.sh /var/backups/financepro/backup-$(date +\%Y\%m\%d).sql
```

Exemplo para limpeza (manter 7 dias):

```bash
find /var/backups/financepro -name "backup-*.sql" -mtime +7 -delete
```
