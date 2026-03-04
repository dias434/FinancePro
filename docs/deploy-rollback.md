# Deploy e Rollback

## Pipeline de Release

O workflow `release.yml` dispara deploy manual via GitHub Actions:
- **staging**: ambiente de homologacao
- **production**: ambiente de producao

### Como fazer deploy

1. Acesse Actions > Release
2. Execute o workflow
3. Selecione o ambiente (staging ou production)
4. Configure secrets no GitHub para o ambiente (DATABASE_URL, JWT_ACCESS_SECRET, etc.)

### Docker da API

Build e run local:

```bash
# Build (a partir da raiz do repo)
docker build -f apps/api/Dockerfile -t financepro-api .

# Migrations: rodar no host ANTES de subir o container (usa o Prisma do projeto)
DATABASE_URL=postgresql://user:pass@host:5432/financepro ./apps/api/scripts/migrate.sh

# Run
docker run -p 3001:3001 -e DATABASE_URL=... -e JWT_ACCESS_SECRET=... financepro-api
```

### Integracao com provedores

O workflow atual gera os builds. Para publicar:

- **Vercel (web)**: conecte o repo e configure auto-deploy por branch ou use a API
- **Railway/Render/Fly.io (API)**: use o Dockerfile e configure DATABASE_URL
- **Custom**: baixe os artifacts e faça deploy manual

---

## Processo de Rollback

### Quando fazer rollback

- Erros criticos em producao apos deploy
- Regressao de funcionalidades
- Incompatibilidade de banco (migrations falhando)

### Passos de rollback

#### 1. Reverter o codigo

```bash
git revert HEAD --no-edit
git push origin main
```

Ou, se usar tags:

```bash
git checkout <tag-versao-anterior>
git push origin main --force  # use com cautela
```

#### 2. Re-deploy da versao anterior

- Dispare o workflow Release com a versao revertida
- Ou restaure o container/image da versao anterior no seu provedor

#### 3. Migrations reversas (se aplicavel)

Se o deploy incluiu migrations que alteraram o schema:

```bash
# Opcao A: restaurar backup do banco (recomendado)
./scripts/restore-db.sh backup-YYYYMMDD-HHMM.sql

# Opcao B: criar migration de reversao manualmente
# Edite o Prisma schema e crie migration que desfaca as alteracoes
```

#### 4. Validacao pos-rollback

- Acesse `/health` e `/health/ready`
- Teste fluxos criticos (login, transacoes)
- Verifique logs e metricas em `/ops/dashboard`

### Rollback rapido (Kubernetes/Docker)

Se usar containers com tags de versao:

```bash
kubectl rollout undo deployment/financepro-api
# ou
docker service update --image financepro/api:v1.2.3 financepro-api
```

---

## Checklist pre-deploy

- [ ] Backup do banco executado
- [ ] Migrations testadas em staging
- [ ] Secrets/config do ambiente conferidos
- [ ] Healthchecks respondendo em staging
