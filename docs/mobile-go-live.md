# Mobile Go-Live

Base de operacao para concluir a Fase 9 do mobile.
Vigencia desta versao: `2026-03-03`.

## 1. Pacote legal para publicacao

- A versao final de publicacao dos textos legais esta refletida em:
  - `apps/mobile/src/screens/terms-screen.tsx`
  - `apps/mobile/src/screens/privacy-screen.tsx`
  - `apps/web/app/terms/page.tsx`
  - `apps/web/app/privacy/page.tsx`
- Toda mudanca em autenticacao, import/export, retencao de dados ou integracoes externas exige revisao destes textos antes de novo release.
- A listagem nas lojas deve apontar para a mesma versao textual usada no app, sem resumir ou contradizer regras de coleta, uso e retencao de dados.

## 2. Ambiente staging com dados de teste e conta demo

- O perfil `preview` em `apps/mobile/eas.json` representa o build interno de staging.
- O app de staging deve usar `EXPO_PUBLIC_API_URL` apontando para a API de homologacao.
- O backend de staging deve manter `CORS_ORIGINS_STAGING` atualizado com a origem usada no build interno.
- A conta demo padrao do beta deve seguir esta convencao:
  - login fixo: `demo@financepro.app`
  - senha fora do Git, armazenada em secret manager e rotacionada a cada nova onda de beta
  - escopo minimo de dados: 1 conta corrente, 1 conta de cartao, categorias, orcamento, meta, transacoes, alertas e historico de importacao
- Antes de liberar o build de staging:
  - restaurar um backup mascarado ou recriar massa de dados sintatica
  - validar login da conta demo
  - validar dashboard, contas, transacoes, import/export e logout

## 3. Beta fechado com coleta de feedback

- Rodar beta fechado com `10` a `30` usuarios divididos entre perfis basicos:
  - usuario individual
  - casal/familia
  - usuario com alto volume de lancamentos
- Cada feedback deve gerar um item rastreavel com um destes labels:
  - `beta-blocker`
  - `beta-ux`
  - `beta-perf`
  - `beta-copy`
- Triage diaria:
  - `beta-blocker` interrompe promocao para lojas
  - `beta-ux` e `beta-perf` precisam ter decisao registrada (corrigir agora, aceitar risco ou adiar)
- Criterio de saida do beta:
  - nenhum bug critico aberto
  - login, cadastro, sincronizacao e criacao de transacao funcionando em staging
  - politica e termos revisados contra a versao publicada

## 4. Ajustes finais de UX e performance

- Metas minimas antes de publicar:
  - cold start abaixo de `3s` em aparelho intermediario
  - login concluido abaixo de `2s` em rede estavel de staging
  - listas principais sem travamento perceptivel ao rolar e filtrar
  - estados de erro e carregamento com texto claro e acao de recuperacao
- Checklist final:
  - revisar textos truncados e overflow em telas pequenas
  - revisar contraste e toques em botoes primarios/links
  - revisar latencia dos fluxos com retry automatico
  - revisar uso de memoria em navegacao longa (login -> dashboard -> CRUD -> import/export)

## 5. Publicacao em lojas (Android/iOS)

- O app mobile passa a usar identificadores estaveis em `apps/mobile/app.json`:
  - Android package: `com.financepro.mobile`
  - iOS bundle identifier: `com.financepro.mobile`
- Fluxo de release:
  1. Gerar build interno de staging: `eas build --platform all --profile preview`
  2. Validar smoke manual no build interno
  3. Gerar build de producao: `eas build --platform all --profile production`
  4. Submeter Android: `eas submit --platform android --profile production`
  5. Submeter iOS: `eas submit --platform ios --profile production`
  6. Registrar tag de release e anexar changelog operacional
- Antes da submissao:
  - conferir screenshots e descricao das lojas
  - conferir respostas de privacidade das lojas com os textos do app
  - conferir versao, build number e versionCode

## 6. Suporte pos-lancamento (bugs criticos, SLA, hotfix)

- Classificacao e SLA:
  - `P0`: indisponibilidade total, falha de login em massa, perda de dados. Ack em `15 min`, mitigacao em `4 h`.
  - `P1`: fluxo principal degradado sem perda de dados. Ack em `1 h`, correcao em ate `1 dia util`.
  - `P2`: erro contornavel ou visual relevante. Ack em `1 dia util`, correcao no proximo ciclo.
- Janela reforcada de observacao:
  - primeiros `7` dias apos release com acompanhamento diario de erros, feedback e healthchecks
- Fluxo de hotfix:
  1. abrir branch `hotfix/<data>-<slug>`
  2. corrigir e rodar smoke minimo (`pnpm test:mobile:smoke`)
  3. gerar build interno `preview`
  4. validar com time responsavel
  5. promover novo build para producao e registrar incidente
- O rollback operacional da API continua documentado em `docs/deploy-rollback.md`.
