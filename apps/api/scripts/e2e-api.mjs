/*
  API critical e2e script.
  Requirements:
  1) API running (default: http://localhost:3001)
  2) DB reachable

  Usage:
  pnpm -C apps/api test:e2e
  API_BASE_URL=http://localhost:3001 pnpm -C apps/api test:e2e
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

async function requestExpectError(path, input = {}) {
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

  if (response.ok) {
    throw new Error(`${method} ${path} should fail but returned ${response.status}`)
  }

  return response
}

function logStep(step) {
  console.log(`\n[e2e] ${step}`)
}

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@financepro.test`
}

function buildCsv(prefix, accountId) {
  return [
    "date;amount;description;type;account",
    `2026-02-10;123.45;${prefix}-csv-income;INCOME;${accountId}`,
    `2026-02-11;-50.00;${prefix}-csv-expense;EXPENSE;${accountId}`,
  ].join("\n")
}

function buildOfx(prefix) {
  return [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "SECURITY:NONE",
    "ENCODING:USASCII",
    "CHARSET:1252",
    "",
    "<OFX>",
    "<BANKMSGSRSV1>",
    "<STMTTRNRS>",
    "<STMTRS>",
    "<BANKTRANLIST>",
    "<STMTTRN>",
    "<TRNTYPE>DEBIT",
    "<DTPOSTED>20260212",
    "<TRNAMT>-33.10",
    `<FITID>${prefix}-ofx-1`,
    `<MEMO>${prefix}-ofx-expense`,
    "</STMTTRN>",
    "<STMTTRN>",
    "<TRNTYPE>CREDIT",
    "<DTPOSTED>20260213",
    "<TRNAMT>50.00",
    `<FITID>${prefix}-ofx-2`,
    `<MEMO>${prefix}-ofx-income`,
    "</STMTTRN>",
    "</BANKTRANLIST>",
    "</STMTRS>",
    "</STMTTRNRS>",
    "</BANKMSGSRSV1>",
    "</OFX>",
  ].join("\n")
}

async function main() {
  logStep(`Health check em ${API_BASE_URL}`)
  const health = await request("/health")
  assert(health && typeof health === "object", "Healthcheck invalido")

  const email = uniqueEmail()
  const password = "E2eTest123!"
  const prefix = `e2e-${Date.now()}`

  logStep("Auth: register, me, refresh e logout")
  const register = await request("/auth/register", {
    method: "POST",
    json: {
      email,
      password,
      name: "E2E Test",
    },
  })

  assert(register?.accessToken, "Register nao retornou accessToken")
  assert(register?.refreshToken, "Register nao retornou refreshToken")

  let accessToken = String(register.accessToken)
  let refreshToken = String(register.refreshToken)

  const me = await request("/auth/me", {
    method: "GET",
    token: accessToken,
  })
  assert(me?.email === email, "Auth me retornou email incorreto")

  const refreshed = await request("/auth/refresh", {
    method: "POST",
    json: { refreshToken },
  })
  assert(refreshed?.accessToken, "Refresh nao retornou accessToken")
  assert(refreshed?.refreshToken, "Refresh nao retornou refreshToken")
  accessToken = String(refreshed.accessToken)
  refreshToken = String(refreshed.refreshToken)

  await request("/auth/logout", {
    method: "POST",
    json: { refreshToken },
  })

  await requestExpectError("/auth/refresh", {
    method: "POST",
    json: { refreshToken },
  })

  const login = await request("/auth/login", {
    method: "POST",
    json: { email, password },
  })
  accessToken = String(login.accessToken)

  logStep("Setup de conta e categoria")
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

  logStep("Transacoes: CRUD")
  const txCreated = await request("/transactions", {
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
  assert(txCreated?.id, "Falha ao criar transacao")

  const txUpdated = await request(`/transactions/${txCreated.id}`, {
    method: "PATCH",
    token: accessToken,
    json: {
      amountCents: 2990,
      description: `${prefix}-manual-updated`,
    },
  })
  assert(txUpdated?.amountCents === 2990, "Falha ao atualizar transacao")

  const txList = await request(`/transactions?limit=200&q=${encodeURIComponent(prefix)}`, {
    method: "GET",
    token: accessToken,
  })
  assert(Array.isArray(txList?.items), "Lista de transacoes invalida")
  assert(txList.items.some((item) => item.id === txCreated.id), "Transacao criada nao apareceu na listagem")

  const txDeleted = await request(`/transactions/${txCreated.id}`, {
    method: "DELETE",
    token: accessToken,
  })
  assert(txDeleted?.ok === true, "Delete de transacao nao retornou ok")

  const txAfterDelete = await request(`/transactions?limit=200&q=${encodeURIComponent(`${prefix}-manual-updated`)}`, {
    method: "GET",
    token: accessToken,
  })
  assert(!txAfterDelete.items.some((item) => item.id === txCreated.id), "Transacao removida ainda aparece na listagem")

  logStep("Import CSV")
  const csvForm = new FormData()
  csvForm.append("file", new Blob([buildCsv(prefix, String(account.id))], { type: "text/csv" }), `${prefix}.csv`)
  csvForm.append("format", "CSV")
  csvForm.append("delimiter", ";")
  csvForm.append("accountId", String(account.id))
  csvForm.append(
    "mapping",
    JSON.stringify({
      dateColumn: "date",
      amountColumn: "amount",
      descriptionColumn: "description",
      typeColumn: "type",
      accountColumn: "account",
    }),
  )

  const csvImport = await request("/imports/run", {
    method: "POST",
    token: accessToken,
    formData: csvForm,
  })
  assert(csvImport?.importLogId, "Import CSV nao retornou importLogId")
  assert(csvImport?.totals?.importedRows >= 2, "Import CSV deveria inserir ao menos 2 linhas")

  logStep("Import OFX")
  const ofxForm = new FormData()
  ofxForm.append("file", new Blob([buildOfx(prefix)], { type: "application/x-ofx" }), `${prefix}.ofx`)
  ofxForm.append("format", "OFX")
  ofxForm.append("accountId", String(account.id))

  const ofxImport = await request("/imports/run", {
    method: "POST",
    token: accessToken,
    formData: ofxForm,
  })
  assert(ofxImport?.importLogId, "Import OFX nao retornou importLogId")
  assert(ofxImport?.totals?.importedRows >= 2, "Import OFX deveria inserir ao menos 2 linhas")

  logStep("Export")
  const exported = await request(
    `/imports/export?mode=json&format=csv&accountId=${encodeURIComponent(String(account.id))}`,
    {
      method: "GET",
      token: accessToken,
    },
  )
  assert(typeof exported?.content === "string", "Export nao retornou conteudo")
  assert(exported.content.includes("date;type;amount"), "Export CSV sem cabecalho esperado")
  assert(exported.content.includes(prefix), "Export nao contem dados do fluxo e2e")

  logStep("Replay")
  const replay = await request(`/imports/logs/${csvImport.importLogId}/replay`, {
    method: "POST",
    token: accessToken,
  })
  assert(replay?.sourceImportLogId === csvImport.importLogId, "Replay nao retornou o sourceImportLogId esperado")
  assert(
    replay?.totals?.duplicateRows >= 1 || replay?.totals?.importedRows >= 1,
    "Replay deveria registrar duplicatas ou importar linhas",
  )

  logStep("Rollback")
  const beforeRollback = await request(`/transactions?limit=500&q=${encodeURIComponent(prefix)}`, {
    method: "GET",
    token: accessToken,
  })
  const beforeCount = Array.isArray(beforeRollback?.items) ? beforeRollback.items.length : 0

  await request(`/imports/logs/${csvImport.importLogId}/rollback`, {
    method: "POST",
    token: accessToken,
  })

  const afterRollback = await request(`/transactions?limit=500&q=${encodeURIComponent(prefix)}`, {
    method: "GET",
    token: accessToken,
  })
  const afterCount = Array.isArray(afterRollback?.items) ? afterRollback.items.length : 0
  assert(afterCount < beforeCount, "Rollback deveria reduzir transacoes relacionadas ao import")

  console.log("\n[e2e] OK - fluxos criticos validados")
  console.log(`[e2e] Usuario de teste: ${email}`)
}

main().catch((error) => {
  console.error("\n[e2e] FALHA:", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
