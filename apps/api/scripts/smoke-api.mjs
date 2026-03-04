/*
  API smoke/e2e script (manual-run).
  Requirements:
  1) API running (default: http://localhost:3001)
  2) DB reachable

  Usage:
  pnpm -C apps/api test:smoke
  API_BASE_URL=http://localhost:3001 pnpm -C apps/api test:smoke
*/

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "")

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, input = {}) {
  const method = input.method ?? "GET"

  const headers = {
    Accept: "application/json",
  }

  if (input.token) {
    headers.Authorization = `Bearer ${input.token}`
  }

  let body
  if (input.formData) {
    body = input.formData
  } else if (input.json !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(input.json)
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`, {
    method,
    headers,
    body,
  })

  const raw = await response.text()
  let parsed = null
  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = raw
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed && typeof parsed.message === "string"
        ? parsed.message
        : `HTTP ${response.status}`
    throw new Error(`${method} ${path} failed: ${message}`)
  }

  return parsed
}

function logStep(step) {
  console.log(`\n[smoke] ${step}`)
}

function uniqueEmail() {
  return `smoke-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@financepro.test`
}

async function main() {
  logStep(`Health check em ${API_BASE_URL}`)
  const health = await request("/health")
  assert(health && typeof health === "object", "Healthcheck invalido")

  const email = uniqueEmail()
  const password = "SmokeTest123!"
  const prefix = `smoke-${Date.now()}`

  logStep("Registro e autenticacao")
  const register = await request("/auth/register", {
    method: "POST",
    json: {
      email,
      password,
      name: "Smoke Test",
    },
  })

  assert(register?.accessToken, "Registro nao retornou accessToken")
  const accessToken = String(register.accessToken)

  const me = await request("/auth/me", {
    method: "GET",
    token: accessToken,
  })

  assert(me?.email === email, "Endpoint /auth/me nao retornou usuario esperado")

  logStep("Criacao de conta e categoria")
  const account = await request("/accounts", {
    method: "POST",
    token: accessToken,
    json: {
      name: `${prefix}-conta`,
      type: "CHECKING",
      currency: "BRL",
    },
  })

  assert(account?.id, "Falha ao criar conta")

  const category = await request("/categories", {
    method: "POST",
    token: accessToken,
    json: {
      name: `${prefix}-categoria`,
      type: "EXPENSE",
    },
  })

  assert(category?.id, "Falha ao criar categoria")

  logStep("Criacao de transacao manual")
  const manualTx = await request("/transactions", {
    method: "POST",
    token: accessToken,
    json: {
      type: "EXPENSE",
      occurredAt: new Date().toISOString(),
      amountCents: 1990,
      accountId: account.id,
      categoryId: category.id,
      description: `${prefix}-manual`,
    },
  })

  assert(manualTx?.id, "Falha ao criar transacao manual")

  logStep("Importacao CSV (run)")
  const csvContent = [
    "date;amount;description;type;account",
    `2026-02-10;123.45;${prefix}-income;INCOME;${account.id}`,
    `2026-02-11;-50.00;${prefix}-expense;EXPENSE;${account.id}`,
  ].join("\n")

  const formData = new FormData()
  formData.append("file", new Blob([csvContent], { type: "text/csv" }), `${prefix}.csv`)
  formData.append("format", "CSV")
  formData.append("delimiter", ";")
  formData.append("accountId", String(account.id))
  formData.append(
    "mapping",
    JSON.stringify({
      dateColumn: "date",
      amountColumn: "amount",
      descriptionColumn: "description",
      typeColumn: "type",
      accountColumn: "account",
    }),
  )

  const runImport = await request("/imports/run", {
    method: "POST",
    token: accessToken,
    formData,
  })

  assert(runImport?.importLogId, "Import nao retornou importLogId")
  assert(runImport?.totals?.importedRows >= 2, "Import deveria inserir ao menos 2 linhas")

  logStep("Consulta de logs e export")
  const logEntry = await request(`/imports/logs/${runImport.importLogId}?itemLimit=20`, {
    method: "GET",
    token: accessToken,
  })

  assert(logEntry?.id === runImport.importLogId, "Nao encontrou log do import")

  const exported = await request(`/imports/export?mode=json&format=csv&accountId=${encodeURIComponent(String(account.id))}`, {
    method: "GET",
    token: accessToken,
  })

  assert(typeof exported?.content === "string", "Export nao retornou conteudo")
  assert(exported.content.includes("date;type;amount"), "Export CSV sem cabecalho esperado")

  logStep("Validacao de rollback")
  const listBeforeRollback = await request(`/transactions?limit=500&q=${encodeURIComponent(prefix)}`, {
    method: "GET",
    token: accessToken,
  })

  const beforeCount = Array.isArray(listBeforeRollback?.items) ? listBeforeRollback.items.length : 0

  await request(`/imports/logs/${runImport.importLogId}/rollback`, {
    method: "POST",
    token: accessToken,
  })

  const listAfterRollback = await request(`/transactions?limit=500&q=${encodeURIComponent(prefix)}`, {
    method: "GET",
    token: accessToken,
  })

  const afterCount = Array.isArray(listAfterRollback?.items) ? listAfterRollback.items.length : 0
  assert(afterCount < beforeCount, "Rollback deveria reduzir quantidade de transacoes importadas")

  console.log("\n[smoke] OK - fluxo critico da API validado")
  console.log(`[smoke] Usuario de teste: ${email}`)
}

main().catch((error) => {
  console.error("\n[smoke] FALHA:", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
