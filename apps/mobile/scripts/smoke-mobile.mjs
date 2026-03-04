import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function read(relPath) {
  const abs = resolve(process.cwd(), relPath)
  assert(existsSync(abs), `Arquivo ausente: ${relPath}`)
  return readFileSync(abs, "utf8")
}

function hasAll(text, snippets, context) {
  for (const snippet of snippets) {
    assert(text.includes(snippet), `${context}: trecho ausente -> ${snippet}`)
  }
}

function main() {
  const criticalFiles = [
    "src/navigation/app-navigator.tsx",
    "src/screens/login-screen.tsx",
    "src/screens/dashboard-screen.tsx",
    "src/screens/transactions-screen.tsx",
    "src/screens/import-export-screen.tsx",
    "src/api/http.ts",
  ]

  for (const file of criticalFiles) {
    read(file)
  }

  const navigator = read("src/navigation/app-navigator.tsx")
  hasAll(
    navigator,
    [
      'name="Dashboard"',
      'name="Transactions"',
      'name="ImportExport"',
      "ImportExportScreen",
      "RootStackParamList",
    ],
    "Navigator",
  )

  const transactionsScreen = read("src/screens/transactions-screen.tsx")
  hasAll(
    transactionsScreen,
    ['navigation.navigate("ImportExport")', 'title="Importar / Exportar"'],
    "Transactions screen",
  )

  const importExportScreen = read("src/screens/import-export-screen.tsx")
  hasAll(
    importExportScreen,
    [
      '"/imports/preview"',
      '"/imports/run"',
      "/imports/logs?",
      "/imports/export?",
      "Assistente de importacao",
    ],
    "Import/Export screen",
  )

  const http = read("src/api/http.ts")
  hasAll(
    http,
    ["MAX_RETRIES", "RETRYABLE_METHODS", "httpFetch"],
    "HTTP client",
  )

  console.log("[mobile-smoke] OK - estrutura critica do app mobile validada")
}

try {
  main()
} catch (error) {
  console.error("[mobile-smoke] FALHA:", error instanceof Error ? error.message : error)
  process.exitCode = 1
}
