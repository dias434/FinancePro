# TODO - FinancePro

## Stack alvo
- **Frontend:** Expo (React Native) + React + componentes base (React Native)
- **Backend:** NestJS + Prisma + PostgreSQL
- **Auth:** JWT (access) + refresh token (rotacao) + reset de senha por e-mail (fase 2)

## Fase 0 - Refazer base (arquitetura e UX)
- [x] Definir identidade (cores, tipografia, layout, componentes base)
- [x] Revisar rotas, navegacao e layout (sidebar/header, mobile, estados vazios)
- [x] Padronizar forms (React Hook Form + Zod), toasts, loaders, skeletons
- [x] Definir padrao de chamadas API (fetch wrapper, tratamento de erros, retries)
- [x] Definir modelo de dados do dominio (contas, transacoes, categorias, orcamento, metas)

## Fase 1 - Autenticacao (login / cadastro)
Fase 1 concluida
### Frontend
- [x] Tela de login (e-mail/senha) + validacao + loading + erros
- [x] Tela de cadastro (minimo)
- [x] Termos/privacidade (minimo)
- [x] Fluxo de logout e protecao de rotas (middleware no Next)
- [x] Persistencia de sessao (cookies httpOnly) + refresh silencioso

### Backend (Nest)
- [x] Bootstrap do Nest (`apps/api`) + config por ambiente (`.env`)
- [x] Prisma + PostgreSQL (docker local via `docker-compose.yml`)
- [x] Prisma migrations (rodar `prisma migrate dev`)
- [x] Usuario (model) + hash de senha (bcryptjs)
- [x] Auth: login, register, refresh (rotacao), logout, revogacao
- [x] Validacao (class-validator) + pipes
- [x] Filters/erros padronizados
- [x] Swagger/OpenAPI (documentacao basica)

## Fase 2 - Dashboard (visao geral)
### Frontend
- [x] Dashboard com cards (saldo total, entradas/saidas do mes, economia)
- [x] Graficos (por categoria, por periodo) + filtros (mes/ano, conta)
- [x] Acessos rapidos (criar transacao, criar categoria)

### Backend
- [x] Endpoints de agregacao (totais por periodo, por categoria, tendencias)
- [x] Paginacao/ordenacao/filtros padrao (query params consistentes)

## Fase 3 - Contas e transacoes (core do produto)
Fase 3 concluida
### Frontend
- [x] Lista de contas + criar/editar/remover
- [x] Lista de transacoes (tabela) com filtros (data, conta, categoria, tipo, busca)
- [x] Form de transacao (entrada/saida/transferencia) + anexos (fase 4)
- [x] Detalhe/edicao rapida e acoes em massa (opcional)

### Backend
- [x] Modelos: Account, Transaction, Category, Tag (opcional)
- [x] Regras: transferencias (dupla movimentacao), consistencia de saldo
- [x] Auditoria minima (createdAt/updatedAt, ownerId)

## Fase 4 - Categorias, orcamento e metas
### Frontend
- [x] CRUD de categorias + icone/cor
- [x] Orcamentos mensais por categoria (limite, consumido, alertas)
- [x] Metas (ex: juntar X ate data Y) + progresso

### Backend
- [x] Modelos: Budget, Goal + regras de calculo
- [x] Jobs/cron (opcional) para alertas e recalculos

## Fase 5 - Import/Export e integracoes (opcional)
### Frontend
- [x] Importar CSV/OFX (assistente passo a passo) + mapeamento de colunas
- [x] Exportar CSV/Excel

### Backend
- [x] Upload seguro + parsing + deduplicacao
- [x] Logs de importacao + replay/rollback simples

## Fase 6 - Qualidade, seguranca e deploy
### Passo 6.1 - Testes (backend + mobile)
- [x] Base inicial de testes criada (scripts de smoke para API e mobile)
- [x] Mobile: smoke tests dos fluxos principais (validacao estrutural de rotas/telas + typecheck)
- [x] Backend: smoke e2e inicial para fluxo critico (auth, transacoes, import/export, rollback)
- [x] Backend: testes unitarios iniciais de regras de negocio (auth, transacoes, import/rollback)
- [x] Backend: testes unitarios de regras de negocio (auth, transacoes, orcamentos, metas, import/export)
- [x] Backend: testes e2e dos fluxos criticos (auth, CRUD transacoes, import CSV/OFX, export, replay/rollback)
- [x] Definir meta de cobertura minima (>=70% linhas no backend) e bloquear merge abaixo da meta (workflow `api-coverage-gate`)

### Passo 6.2 - Seguranca e robustez da API
- [x] Rate limiting por IP e por usuario autenticado
- [x] CORS restrito por ambiente (dev, staging, prod)
- [x] Headers de seguranca (helmet) e hardening de respostas
- [x] Revisar uploads: limite de tamanho, mime-type, timeout, validacao de payload
- [x] Padronizar codigos de erro para mobile tratar mensagens de forma consistente

### Passo 6.3 - Observabilidade e operacao
- [x] Logs estruturados com correlation id por request
- [x] Metricas basicas (latencia, erro por endpoint, volume de imports)
- [x] Healthchecks de app + banco + fila/jobs (se houver)
- [x] Dashboard operacional minimo para acompanhar falhas e performance

### Passo 6.4 - Deploy e CI/CD
- [x] Pipeline CI (lint, typecheck, build, test) para apps/api e apps/mobile
- [x] Pipeline de release (staging -> producao) com rollback documentado
- [x] Docker da API + scripts de migracao automatica no deploy
- [x] Estrategia de backup e restore do PostgreSQL testada

## Fase 7 - Produto completo para controle financeiro (mobile-first)
### Funcionalidades essenciais que faltam
- [x] Lancamentos recorrentes (mensal, semanal, anual) com pausa/cancelamento
- [x] Cartao de credito completo (fatura, fechamento, vencimento, limite, pagamento parcial)
- [x] Parcelamento de despesas/receitas com geracao automatica das parcelas
- [x] Conciliacao de saldo por conta (saldo esperado x saldo real)
- [x] Regra de notificacoes (orcamento estourando, meta atrasada, contas a vencer)

### Fase 8 - Funcionalidades de valor alto
- [x] Backup/export automatico mensal para arquivo
- [x] Campos customizaveis por transacao (tags, centro de custo, observacao longa)
- [x] Relatorios avancados (comparativo mes a mes, categorias que mais cresceram, previsao)
- [x] Multi-moeda basica (conta com moeda e conversao no dashboard)

## Fase 9 - Go-live do app mobile
Fase 9 concluida
- [x] Politica de privacidade e termos finais (versao juridica para publicacao)
- [x] Ambiente staging com dados de teste e conta demo
- [x] Beta fechado (10-30 usuarios) com coleta de feedback
- [x] Ajustes finais de UX/performance com base no beta
- [x] Publicacao em lojas (Android/iOS) com processo de release documentado
- [x] Plano de suporte pos-lancamento (bugs criticos, SLA, hotfix)

## Paridade Mobile (2026-02-25)
- [x] Fase 1 aplicada no mobile (login/cadastro/termos/logout/protecao de rotas/sessao com refresh)
- [x] Fase 2 aplicada no mobile (cards, filtros de periodo e conta, visual grafica e atalhos rapidos)
- [x] Fase 3 aplicada no mobile (contas, transacoes, filtros, transferencia, edicao e remocao)
- [x] Fase 4 aplicada no mobile (categorias, orcamentos por categoria e metas com progresso)
- [x] Fase 5 aplicada no mobile (assistente de importacao CSV/OFX com mapeamento, exportacao CSV/Excel, historico com replay/rollback)
- [x] Fase 6 aplicada no mobile (testes, seguranca, observabilidade e deploy)
- [x] Fase 7 aplicada no mobile (recorrencia, cartao, parcelamento, conciliacao, notificacoes)
- [x] Fase 8 aplicada no mobile (backup mensal, campos customizaveis, relatorios avancados e multi-moeda)
- [x] Fase 9 aplicada no mobile (beta, go-live e operacao)
- [x] Cliente HTTP mobile com retry para falhas transitorias em metodos idempotentes
