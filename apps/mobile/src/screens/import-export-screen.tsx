import * as React from "react"
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useIsFocused } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"

import { useAuth } from "../auth/auth-context"
import { formatOfflineTimestamp, readOfflineCache, writeOfflineCache } from "../lib/offline-cache"
import {
  IMPORT_EXPORT_ACCOUNTS_CACHE_KEY,
  IMPORT_EXPORT_BACKUPS_CACHE_KEY,
  IMPORT_EXPORT_LOGS_CACHE_KEY,
} from "../lib/offline-keys"
import {
  applyPendingEntityOperations,
  countPendingOperations,
  flushPendingOperations,
  readPendingOperations,
} from "../lib/offline-outbox"
import type { RootStackParamList } from "../navigation/app-navigator"
import { Card, PrimaryButton } from "../ui/components"
import { theme } from "../ui/theme"

type CsvMapping = {
  dateColumn?: string
  amountColumn?: string
  descriptionColumn?: string
  typeColumn?: string
  categoryColumn?: string
  accountColumn?: string
}

type Account = {
  id: string
  name: string
}

type AccountsResponse = {
  items: Account[]
}

type ImportPreviewRow = {
  rowIndex: number
  raw: Record<string, string>
  issues: string[]
  normalized: {
    occurredAt: string
    amountCents: number
    type: "INCOME" | "EXPENSE"
    accountId: string
    categoryId: string | null
    description?: string
  } | null
}

type ImportPreviewResponse = {
  format: "CSV" | "OFX"
  fileName: string
  delimiter?: string
  columns?: string[]
  suggestedMapping?: CsvMapping
  effectiveMapping?: CsvMapping
  totalRows: number
  validRows: number
  invalidRows: number
  sample: ImportPreviewRow[]
}

type ImportRunResponse = {
  importLogId: string
  status: "COMPLETED" | "FAILED" | "ROLLED_BACK"
  totals: {
    totalRows: number
    importedRows: number
    duplicateRows: number
    errorRows: number
  }
  completedAt?: string | null
}

type ImportLogItem = {
  rowIndex: number
  status: "IMPORTED" | "DUPLICATE" | "ERROR" | "ROLLED_BACK"
}

type ImportLogEntry = {
  id: string
  fileName: string
  format: "CSV" | "OFX"
  status: "COMPLETED" | "FAILED" | "ROLLED_BACK"
  totalRows: number
  importedRows: number
  duplicateRows: number
  errorRows: number
  createdAt: string
  completedAt?: string | null
  rolledBackAt?: string | null
  items: ImportLogItem[]
}

type ImportLogsResponse = {
  items: ImportLogEntry[]
}

type ExportResponse = {
  format: "csv" | "excel"
  fileName: string
  mimeType: string
  count: number
  content: string
}

type MonthlyBackupEntry = {
  fileName: string
  monthKey: string | null
  sizeBytes: number
  updatedAt: string
}

type MonthlyBackupsResponse = {
  items: MonthlyBackupEntry[]
}

type MonthlyBackupRunResponse = {
  created: boolean
  fileName: string
  monthKey: string
  sizeBytes: number
  updatedAt: string
  count?: number
}

const EMPTY_MAPPING: CsvMapping = {
  dateColumn: "",
  amountColumn: "",
  descriptionColumn: "",
  typeColumn: "",
  categoryColumn: "",
  accountColumn: "",
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function formatImportStatus(status: ImportLogEntry["status"]) {
  if (status === "FAILED") return "Falhou"
  if (status === "ROLLED_BACK") return "Rollback aplicado"
  return "Concluido"
}

function buildUploadFormData(input: {
  fileName: string
  format: "CSV" | "OFX"
  content: string
  delimiter?: string
  accountId?: string
  mapping?: CsvMapping
  defaults?: { accountId?: string; type?: "INCOME" | "EXPENSE" }
}) {
  if (typeof Blob === "undefined") {
    throw new Error("Blob API indisponivel no ambiente mobile.")
  }

  const formData = new FormData()
  const mimeType = input.format === "CSV" ? "text/csv" : "application/ofx"
  const blob = new Blob([input.content], { type: mimeType })

  formData.append("file", blob as any, input.fileName)
  formData.append("format", input.format)

  if (input.delimiter && input.delimiter.trim()) {
    formData.append("delimiter", input.delimiter.trim().slice(0, 1))
  }

  if (input.accountId?.trim()) {
    formData.append("accountId", input.accountId.trim())
  }

  if (input.mapping) {
    formData.append("mapping", JSON.stringify(input.mapping))
  }

  if (input.defaults && Object.keys(input.defaults).length > 0) {
    formData.append("defaults", JSON.stringify(input.defaults))
  }

  return formData
}

type Props = NativeStackScreenProps<RootStackParamList, "ImportExport">

export function ImportExportScreen({}: Props) {
  const { apiFetch } = useAuth()
  const isFocused = useIsFocused()
  const [offlineState, setOfflineState] = React.useState<Record<string, string>>({})

  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = React.useState(true)

  const [step, setStep] = React.useState<1 | 2 | 3>(1)
  const [importFormat, setImportFormat] = React.useState<"CSV" | "OFX">("CSV")
  const [fileName, setFileName] = React.useState("import.csv")
  const [delimiter, setDelimiter] = React.useState(";")
  const [defaultAccountId, setDefaultAccountId] = React.useState("")
  const [defaultType, setDefaultType] = React.useState<"auto" | "INCOME" | "EXPENSE">("auto")
  const [rawContent, setRawContent] = React.useState("")
  const [mapping, setMapping] = React.useState<CsvMapping>(EMPTY_MAPPING)
  const [preview, setPreview] = React.useState<ImportPreviewResponse | null>(null)
  const [previewing, setPreviewing] = React.useState(false)
  const [runningImport, setRunningImport] = React.useState(false)
  const [runResult, setRunResult] = React.useState<ImportRunResponse | null>(null)

  const [logs, setLogs] = React.useState<ImportLogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = React.useState(true)
  const [applyingActionLogId, setApplyingActionLogId] = React.useState<string | null>(null)

  const [exportFormat, setExportFormat] = React.useState<"csv" | "excel">("csv")
  const [exportFrom, setExportFrom] = React.useState("")
  const [exportTo, setExportTo] = React.useState("")
  const [exportAccountId, setExportAccountId] = React.useState("all")
  const [exportType, setExportType] = React.useState<"all" | "INCOME" | "EXPENSE" | "TRANSFER">("all")
  const [exporting, setExporting] = React.useState(false)
  const [exportInfo, setExportInfo] = React.useState<ExportResponse | null>(null)
  const [backups, setBackups] = React.useState<MonthlyBackupEntry[]>([])
  const [loadingBackups, setLoadingBackups] = React.useState(true)
  const [runningBackup, setRunningBackup] = React.useState(false)

  const updateOfflineState = React.useCallback((key: string, message: string | null) => {
    setOfflineState((current) => {
      const next = { ...current }
      if (message) {
        next[key] = message
      } else {
        delete next[key]
      }
      return next
    })
  }, [])

  const offlineEntries = Object.values(offlineState)
  const offlineNotice =
    offlineEntries.length > 0 ? `Modo offline: ${offlineEntries.join(" | ")}` : null

  React.useEffect(() => {
    if (!isFocused) return

    let alive = true
    setLoadingAccounts(true)
    void (async () => {
      const [cached, pendingBefore] = await Promise.all([
        readOfflineCache<AccountsResponse>(IMPORT_EXPORT_ACCOUNTS_CACHE_KEY),
        readPendingOperations(),
      ])
      const fallbackAccounts = applyPendingEntityOperations(
        cached?.value.items ?? [],
        pendingBefore,
        "account",
        {
          sort: (a, b) => a.name.localeCompare(b.name),
        },
      )

      if (cached || fallbackAccounts.length > 0) {
        if (!alive) return
        setAccounts(fallbackAccounts)
        updateOfflineState(
          "accounts",
          cached
            ? `contas em ${formatOfflineTimestamp(cached.updatedAt)}`
            : "contas com alteracoes locais pendentes",
        )
        updateOfflineState(
          "sync",
          countPendingOperations(pendingBefore) > 0
            ? `${countPendingOperations(pendingBefore)} operacao(oes) pendente(s) de sincronizacao`
            : null,
        )
        setLoadingAccounts(false)
      }

      try {
        await flushPendingOperations(apiFetch)
        const pendingAfter = await readPendingOperations()
        const response = await apiFetch<AccountsResponse>(
          "/accounts?page=1&pageSize=200&sortBy=name&sortDir=asc",
          {
            cache: "no-store",
          } as any,
        )
        if (!alive) return
        setAccounts(
          applyPendingEntityOperations(response.items ?? [], pendingAfter, "account", {
            sort: (a, b) => a.name.localeCompare(b.name),
          }),
        )
        updateOfflineState("accounts", null)
        updateOfflineState(
          "sync",
          countPendingOperations(pendingAfter) > 0
            ? `${countPendingOperations(pendingAfter)} operacao(oes) pendente(s) de sincronizacao`
            : null,
        )
        await writeOfflineCache(IMPORT_EXPORT_ACCOUNTS_CACHE_KEY, response)
      } catch {
        if (!alive) return
        if (!cached && fallbackAccounts.length === 0) {
          setAccounts([])
          updateOfflineState("accounts", null)
          updateOfflineState("sync", null)
        }
      } finally {
        if (!alive) return
        setLoadingAccounts(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [apiFetch, isFocused, updateOfflineState])

  const loadLogs = React.useCallback(async () => {
    setLoadingLogs(true)
    const cached = await readOfflineCache<ImportLogsResponse>(IMPORT_EXPORT_LOGS_CACHE_KEY)

    if (cached) {
      setLogs(cached.value.items ?? [])
      updateOfflineState("logs", `historico em ${formatOfflineTimestamp(cached.updatedAt)}`)
      setLoadingLogs(false)
    }

    try {
      const response = await apiFetch<ImportLogsResponse>(
        "/imports/logs?page=1&pageSize=20&itemLimit=5",
        { cache: "no-store" } as any,
      )
      setLogs(response.items ?? [])
      updateOfflineState("logs", null)
      await writeOfflineCache(IMPORT_EXPORT_LOGS_CACHE_KEY, response)
    } catch (error) {
      if (!cached) {
        setLogs([])
        updateOfflineState("logs", null)
      }
    } finally {
      setLoadingLogs(false)
    }
  }, [apiFetch, updateOfflineState])

  const loadBackups = React.useCallback(async () => {
    setLoadingBackups(true)
    const cached = await readOfflineCache<MonthlyBackupsResponse>(IMPORT_EXPORT_BACKUPS_CACHE_KEY)

    if (cached) {
      setBackups(cached.value.items ?? [])
      updateOfflineState("backups", `backups em ${formatOfflineTimestamp(cached.updatedAt)}`)
      setLoadingBackups(false)
    }

    try {
      const response = await apiFetch<MonthlyBackupsResponse>("/imports/backups", {
        cache: "no-store",
      } as any)
      setBackups(response.items ?? [])
      updateOfflineState("backups", null)
      await writeOfflineCache(IMPORT_EXPORT_BACKUPS_CACHE_KEY, response)
    } catch {
      if (!cached) {
        setBackups([])
        updateOfflineState("backups", null)
      }
    } finally {
      setLoadingBackups(false)
    }
  }, [apiFetch, updateOfflineState])

  React.useEffect(() => {
    if (!isFocused) return
    void loadLogs()
  }, [isFocused, loadLogs])

  React.useEffect(() => {
    if (!isFocused) return
    void loadBackups()
  }, [isFocused, loadBackups])

  const resetWizard = () => {
    setStep(1)
    setPreview(null)
    setRunResult(null)
    setMapping(EMPTY_MAPPING)
  }

  const onChangeFormat = (format: "CSV" | "OFX") => {
    setImportFormat(format)
    setFileName(format === "CSV" ? "import.csv" : "import.ofx")
    resetWizard()
  }

  const previewImport = async () => {
    if (!rawContent.trim()) {
      Alert.alert("Conteudo vazio", "Cole o conteudo CSV/OFX antes de gerar o preview.")
      return
    }

    setPreviewing(true)
    try {
      const formData = buildUploadFormData({
        fileName: fileName.trim() || (importFormat === "CSV" ? "import.csv" : "import.ofx"),
        format: importFormat,
        content: rawContent,
        delimiter,
        accountId: defaultAccountId || undefined,
      })

      const response = await apiFetch<ImportPreviewResponse>("/imports/preview", {
        method: "POST",
        body: formData as any,
      })

      setPreview(response)
      if (response.effectiveMapping) {
        setMapping({
          ...EMPTY_MAPPING,
          ...response.effectiveMapping,
        })
      } else if (response.suggestedMapping) {
        setMapping({
          ...EMPTY_MAPPING,
          ...response.suggestedMapping,
        })
      }
      setStep(2)
    } catch (error) {
      Alert.alert("Erro no preview", error instanceof Error ? error.message : "Falha ao gerar preview")
    } finally {
      setPreviewing(false)
    }
  }

  const runImport = async () => {
    if (!rawContent.trim()) {
      Alert.alert("Conteudo vazio", "Cole o conteudo CSV/OFX antes de importar.")
      return
    }

    setRunningImport(true)
    try {
      const defaults: { accountId?: string; type?: "INCOME" | "EXPENSE" } = {}
      if (defaultAccountId) defaults.accountId = defaultAccountId
      if (defaultType !== "auto") defaults.type = defaultType

      const formData = buildUploadFormData({
        fileName: fileName.trim() || (importFormat === "CSV" ? "import.csv" : "import.ofx"),
        format: importFormat,
        content: rawContent,
        delimiter,
        accountId: defaultAccountId || undefined,
        mapping: importFormat === "CSV" ? mapping : undefined,
        defaults,
      })

      const response = await apiFetch<ImportRunResponse>("/imports/run", {
        method: "POST",
        body: formData as any,
      })

      setRunResult(response)
      setStep(3)
      await loadLogs()
    } catch (error) {
      Alert.alert("Erro na importacao", error instanceof Error ? error.message : "Falha ao importar")
    } finally {
      setRunningImport(false)
    }
  }

  const replayLog = async (log: ImportLogEntry) => {
    setApplyingActionLogId(log.id)
    try {
      await apiFetch(`/imports/logs/${log.id}/replay`, { method: "POST" })
      await loadLogs()
      Alert.alert("Replay executado", "Importacao reproduzida com sucesso.")
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao executar replay")
    } finally {
      setApplyingActionLogId(null)
    }
  }

  const rollbackLog = async (log: ImportLogEntry) => {
    Alert.alert("Aplicar rollback?", "Essa acao remove as transacoes importadas por esse log.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Aplicar rollback",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setApplyingActionLogId(log.id)
            try {
              await apiFetch(`/imports/logs/${log.id}/rollback`, { method: "POST" })
              await loadLogs()
            } catch (error) {
              Alert.alert("Erro", error instanceof Error ? error.message : "Falha ao aplicar rollback")
            } finally {
              setApplyingActionLogId(null)
            }
          })()
        },
      },
    ])
  }

  const runMonthlyBackup = async () => {
    setRunningBackup(true)
    try {
      const response = await apiFetch<MonthlyBackupRunResponse>("/imports/backups/run", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      })

      await loadBackups()
      Alert.alert(
        "Backup mensal",
        response.created
          ? `Arquivo ${response.fileName} gerado para ${response.monthKey}.`
          : `O backup de ${response.monthKey} ja existia.`,
      )
    } catch (error) {
      Alert.alert("Erro no backup", error instanceof Error ? error.message : "Falha ao gerar backup mensal")
    } finally {
      setRunningBackup(false)
    }
  }

  const runExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.set("mode", "json")
      params.set("format", exportFormat)
      if (exportFrom.trim()) params.set("from", exportFrom.trim())
      if (exportTo.trim()) params.set("to", exportTo.trim())
      if (exportAccountId !== "all") params.set("accountId", exportAccountId)
      if (exportType !== "all") params.set("type", exportType)

      const response = await apiFetch<ExportResponse>(`/imports/export?${params.toString()}`, {
        cache: "no-store",
      } as any)

      setExportInfo(response)
      await Share.share({
        title: response.fileName,
        message: response.content,
      })
    } catch (error) {
      Alert.alert("Erro no export", error instanceof Error ? error.message : "Falha ao exportar")
    } finally {
      setExporting(false)
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {offlineNotice ? <Text style={styles.muted}>{offlineNotice}</Text> : null}

        <Card title="Assistente de importacao (mobile)">
          <Text style={styles.muted}>Passo {step} de 3</Text>

          <Text style={styles.label}>Formato</Text>
          <View style={styles.row}>
            <Text style={[styles.chip, importFormat === "CSV" ? styles.chipActive : null]} onPress={() => onChangeFormat("CSV")}>
              CSV
            </Text>
            <Text style={[styles.chip, importFormat === "OFX" ? styles.chipActive : null]} onPress={() => onChangeFormat("OFX")}>
              OFX
            </Text>
          </View>

          <Text style={styles.label}>Nome do arquivo</Text>
          <TextInput
            value={fileName}
            onChangeText={setFileName}
            placeholder={importFormat === "CSV" ? "import.csv" : "import.ofx"}
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />

          <Text style={styles.label}>Conta padrao (recomendado para OFX)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              <Text style={[styles.chip, defaultAccountId === "" ? styles.chipActive : null]} onPress={() => setDefaultAccountId("")}>
                Nenhuma
              </Text>
              {accounts.map((account) => (
                <Text
                  key={account.id}
                  style={[styles.chip, defaultAccountId === account.id ? styles.chipActive : null]}
                  onPress={() => setDefaultAccountId(account.id)}
                >
                  {account.name}
                </Text>
              ))}
            </View>
          </ScrollView>
          {loadingAccounts ? <Text style={styles.muted}>Carregando contas...</Text> : null}

          {importFormat === "CSV" ? (
            <>
              <Text style={styles.label}>Delimitador</Text>
              <TextInput
                value={delimiter}
                onChangeText={(value) => setDelimiter(value.slice(0, 1))}
                placeholder=";"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
            </>
          ) : null}

          <Text style={styles.label}>Tipo padrao (quando nao houver coluna tipo)</Text>
          <View style={styles.row}>
            <Text style={[styles.chip, defaultType === "auto" ? styles.chipActive : null]} onPress={() => setDefaultType("auto")}>
              Automatico
            </Text>
            <Text style={[styles.chip, defaultType === "INCOME" ? styles.chipActive : null]} onPress={() => setDefaultType("INCOME")}>
              Entrada
            </Text>
            <Text style={[styles.chip, defaultType === "EXPENSE" ? styles.chipActive : null]} onPress={() => setDefaultType("EXPENSE")}>
              Saida
            </Text>
          </View>

          <Text style={styles.label}>Cole aqui o conteudo do arquivo</Text>
          <TextInput
            value={rawContent}
            onChangeText={setRawContent}
            placeholder={importFormat === "CSV" ? "data;valor;descricao" : "<OFX>..."}
            placeholderTextColor={theme.colors.muted}
            style={[styles.input, styles.textArea]}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.row}>
            <PrimaryButton title="Gerar preview" onPress={() => void previewImport()} disabled={previewing || runningImport} />
            <PrimaryButton title="Limpar" onPress={resetWizard} />
          </View>
          {previewing ? <ActivityIndicator /> : null}

          {preview ? (
            <View style={styles.block}>
              <Text style={styles.value}>Preview: {preview.totalRows} linhas</Text>
              <Text style={styles.muted}>
                Validas: {preview.validRows} | Invalidas: {preview.invalidRows}
              </Text>
              {preview.columns?.length ? (
                <Text style={styles.muted}>Colunas: {preview.columns.join(", ")}</Text>
              ) : null}
            </View>
          ) : null}

          {step >= 2 && importFormat === "CSV" ? (
            <View style={styles.block}>
              <Text style={styles.value}>Passo 2: mapeamento de colunas</Text>
              <TextInput
                value={mapping.dateColumn ?? ""}
                onChangeText={(value) => setMapping((prev) => ({ ...prev, dateColumn: value }))}
                placeholder="dateColumn (ex: data)"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <TextInput
                value={mapping.amountColumn ?? ""}
                onChangeText={(value) => setMapping((prev) => ({ ...prev, amountColumn: value }))}
                placeholder="amountColumn (ex: valor)"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <TextInput
                value={mapping.descriptionColumn ?? ""}
                onChangeText={(value) => setMapping((prev) => ({ ...prev, descriptionColumn: value }))}
                placeholder="descriptionColumn (opcional)"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <TextInput
                value={mapping.typeColumn ?? ""}
                onChangeText={(value) => setMapping((prev) => ({ ...prev, typeColumn: value }))}
                placeholder="typeColumn (opcional)"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <TextInput
                value={mapping.accountColumn ?? ""}
                onChangeText={(value) => setMapping((prev) => ({ ...prev, accountColumn: value }))}
                placeholder="accountColumn (opcional)"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <TextInput
                value={mapping.categoryColumn ?? ""}
                onChangeText={(value) => setMapping((prev) => ({ ...prev, categoryColumn: value }))}
                placeholder="categoryColumn (opcional)"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
            </View>
          ) : null}

          {step >= 2 ? (
            <PrimaryButton title="Executar importacao" onPress={() => void runImport()} disabled={runningImport} />
          ) : null}
          {runningImport ? <ActivityIndicator /> : null}

          {runResult ? (
            <View style={styles.block}>
              <Text style={styles.value}>Passo 3: resultado</Text>
              <Text style={styles.muted}>Status: {runResult.status}</Text>
              <Text style={styles.muted}>
                Importadas: {runResult.totals.importedRows} | Duplicadas: {runResult.totals.duplicateRows} | Erros: {runResult.totals.errorRows}
              </Text>
              <Text style={styles.muted}>Log: {runResult.importLogId}</Text>
            </View>
          ) : null}
        </Card>

        <Card title="Historico (replay / rollback)">
          {loadingLogs ? (
            <ActivityIndicator />
          ) : logs.length === 0 ? (
            <Text style={styles.muted}>Sem importacoes registradas.</Text>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <Text style={styles.value}>{log.fileName}</Text>
                <Text style={styles.muted}>
                  {log.format} | {formatImportStatus(log.status)}
                </Text>
                <Text style={styles.muted}>
                  Importadas: {log.importedRows} | Duplicadas: {log.duplicateRows} | Erros: {log.errorRows}
                </Text>
                <Text style={styles.muted}>Criado: {formatDate(log.createdAt)}</Text>
                <View style={styles.row}>
                  <PrimaryButton
                    title="Replay"
                    onPress={() => void replayLog(log)}
                    disabled={applyingActionLogId === log.id}
                  />
                  <PrimaryButton
                    title="Rollback"
                    onPress={() => rollbackLog(log)}
                    disabled={applyingActionLogId === log.id || log.status === "ROLLED_BACK"}
                  />
                </View>
              </View>
            ))
          )}
          <PrimaryButton title="Atualizar historico" onPress={() => void loadLogs()} disabled={loadingLogs} />
        </Card>

        <Card title="Backup mensal automatico">
          <Text style={styles.muted}>A API gera o arquivo do ultimo mes automaticamente e salva no servidor.</Text>
          <PrimaryButton title="Rodar agora" onPress={() => void runMonthlyBackup()} disabled={runningBackup} />
          {runningBackup ? <ActivityIndicator /> : null}
          {loadingBackups ? (
            <ActivityIndicator />
          ) : backups.length === 0 ? (
            <Text style={styles.muted}>Nenhum backup mensal encontrado.</Text>
          ) : (
            backups.map((item) => (
              <View key={item.fileName} style={styles.logItem}>
                <Text style={styles.value}>{item.fileName}</Text>
                <Text style={styles.muted}>Mes: {item.monthKey ?? "-"}</Text>
                <Text style={styles.muted}>Tamanho: {item.sizeBytes} bytes</Text>
                <Text style={styles.muted}>Atualizado: {formatDate(item.updatedAt)}</Text>
              </View>
            ))
          )}
          <PrimaryButton title="Atualizar backups" onPress={() => void loadBackups()} disabled={loadingBackups} />
        </Card>

        <Card title="Exportar CSV / Excel">
          <Text style={styles.label}>Formato</Text>
          <View style={styles.row}>
            <Text style={[styles.chip, exportFormat === "csv" ? styles.chipActive : null]} onPress={() => setExportFormat("csv")}>
              CSV
            </Text>
            <Text style={[styles.chip, exportFormat === "excel" ? styles.chipActive : null]} onPress={() => setExportFormat("excel")}>
              Excel
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>De (YYYY-MM-DD)</Text>
              <TextInput
                value={exportFrom}
                onChangeText={setExportFrom}
                placeholder="2026-01-01"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Ate (YYYY-MM-DD)</Text>
              <TextInput
                value={exportTo}
                onChangeText={setExportTo}
                placeholder="2026-01-31"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Conta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.row}>
              <Text style={[styles.chip, exportAccountId === "all" ? styles.chipActive : null]} onPress={() => setExportAccountId("all")}>
                Todas
              </Text>
              {accounts.map((account) => (
                <Text
                  key={account.id}
                  style={[styles.chip, exportAccountId === account.id ? styles.chipActive : null]}
                  onPress={() => setExportAccountId(account.id)}
                >
                  {account.name}
                </Text>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>Tipo</Text>
          <View style={styles.row}>
            {(["all", "INCOME", "EXPENSE", "TRANSFER"] as const).map((type) => (
              <Text
                key={type}
                style={[styles.chip, exportType === type ? styles.chipActive : null]}
                onPress={() => setExportType(type)}
              >
                {type}
              </Text>
            ))}
          </View>

          <PrimaryButton title="Gerar e compartilhar export" onPress={() => void runExport()} disabled={exporting} />
          {exporting ? <ActivityIndicator /> : null}
          {exportInfo ? (
            <View style={styles.block}>
              <Text style={styles.value}>{exportInfo.fileName}</Text>
              <Text style={styles.muted}>Registros: {exportInfo.count}</Text>
              <Text style={styles.muted} numberOfLines={6}>
                {exportInfo.content}
              </Text>
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  muted: {
    color: theme.colors.muted,
  },
  value: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 160,
    textAlignVertical: "top",
  },
  chip: {
    color: theme.colors.text,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  block: {
    gap: 6,
    paddingTop: 4,
  },
  logItem: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
})
