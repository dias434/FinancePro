import { ApiError } from "../api/http"
import { readOfflineCache, writeOfflineCache } from "./offline-cache"

const OUTBOX_CACHE_KEY = "offline:outbox"

export type OfflineEntity = "account" | "category" | "transaction" | "budget" | "goal"
export type OfflineOperationType = "create" | "update" | "delete"

export type PendingOperation = {
  id: string
  entity: OfflineEntity
  op: OfflineOperationType
  method: "POST" | "PATCH" | "DELETE"
  clientId: string
  path: string
  body?: Record<string, unknown>
  snapshot?: Record<string, unknown> | null
  createdAt: string
  retryCount: number
  lastError?: string | null
}

type OutboxState = {
  items: PendingOperation[]
}

type ApiFetchLike = <T>(
  path: string,
  init?: RequestInit & { parseAs?: "json" | "text" },
) => Promise<T>

export type FlushPendingOperationsResult = {
  synced: number
  remaining: number
  failedOperationId?: string | null
}

const EMPTY_OUTBOX: OutboxState = {
  items: [],
}

let activeFlushPromise: Promise<FlushPendingOperationsResult> | null = null

function createOperationId() {
  return `op:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`
}

function toMethod(op: OfflineOperationType): PendingOperation["method"] {
  switch (op) {
    case "create":
      return "POST"
    case "update":
      return "PATCH"
    case "delete":
      return "DELETE"
  }
}

function sortByCreatedAt(a: PendingOperation, b: PendingOperation) {
  return a.createdAt.localeCompare(b.createdAt)
}

function mergeRecords(
  base: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown> | null | undefined,
) {
  if (!base && !patch) return undefined
  if (!base) return patch ?? undefined
  if (!patch) return base
  return {
    ...base,
    ...patch,
  }
}

function replaceInValue(value: unknown, before: string, after: string): unknown {
  if (typeof value === "string") {
    return value === before ? after : value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => replaceInValue(entry, before, after))
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, replaceInValue(entry, before, after)]),
    )
  }

  return value
}

function replaceInPath(path: string, before: string, after: string) {
  return path.split(before).join(after)
}

function replaceInOperation(item: PendingOperation, before: string, after: string): PendingOperation {
  return {
    ...item,
    clientId: item.clientId === before ? after : item.clientId,
    path: replaceInPath(item.path, before, after),
    body:
      item.body && typeof item.body === "object"
        ? (replaceInValue(item.body, before, after) as Record<string, unknown>)
        : item.body,
    snapshot:
      item.snapshot && typeof item.snapshot === "object"
        ? (replaceInValue(item.snapshot, before, after) as Record<string, unknown>)
        : item.snapshot,
  }
}

function matchesEntityId(item: PendingOperation, entity: OfflineEntity, clientId: string) {
  return item.entity === entity && item.clientId === clientId
}

function extractResponseId(value: unknown) {
  if (!value || typeof value !== "object") return null
  if (!("id" in value)) return null
  const id = (value as { id?: unknown }).id
  return typeof id === "string" && id.trim() ? id : null
}

async function readOutboxState(): Promise<OutboxState> {
  const cached = await readOfflineCache<OutboxState>(OUTBOX_CACHE_KEY)
  if (!cached?.value || typeof cached.value !== "object") return EMPTY_OUTBOX

  const items = Array.isArray(cached.value.items)
    ? cached.value.items
        .filter(
          (item): item is PendingOperation =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof (item as PendingOperation).id === "string" &&
                typeof (item as PendingOperation).entity === "string" &&
                typeof (item as PendingOperation).op === "string" &&
                typeof (item as PendingOperation).method === "string" &&
                typeof (item as PendingOperation).clientId === "string" &&
                typeof (item as PendingOperation).path === "string" &&
                typeof (item as PendingOperation).createdAt === "string",
            ),
        )
        .sort(sortByCreatedAt)
    : []

  return { items }
}

async function writeOutboxState(items: PendingOperation[]) {
  await writeOfflineCache(OUTBOX_CACHE_KEY, {
    items: [...items].sort(sortByCreatedAt),
  } satisfies OutboxState)
}

export function createLocalId(entity: OfflineEntity) {
  return `local:${entity}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`
}

export function isLocalId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("local:")
}

export function isOfflineLikeError(error: unknown) {
  return !(error instanceof ApiError)
}

export async function readPendingOperations() {
  const state = await readOutboxState()
  return state.items
}

export function countPendingOperations(
  items: PendingOperation[],
  entity?: OfflineEntity,
) {
  if (!entity) return items.length
  return items.filter((item) => item.entity === entity).length
}

export async function queueOfflineOperation(input: {
  entity: OfflineEntity
  op: OfflineOperationType
  clientId: string
  path: string
  body?: Record<string, unknown>
  snapshot?: Record<string, unknown> | null
}): Promise<PendingOperation | null> {
  const state = await readOutboxState()
  let items = [...state.items]

  if (input.op === "delete" && isLocalId(input.clientId)) {
    items = items.filter((item) => !matchesEntityId(item, input.entity, input.clientId))
    await writeOutboxState(items)
    return null
  }

  const nextBase: PendingOperation = {
    id: createOperationId(),
    entity: input.entity,
    op: input.op,
    method: toMethod(input.op),
    clientId: input.clientId,
    path: input.path,
    body: input.body,
    snapshot: input.snapshot ?? null,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    lastError: null,
  }

  if (input.op === "update") {
    if (isLocalId(input.clientId)) {
      const createIndex = items.findIndex(
        (item) =>
          matchesEntityId(item, input.entity, input.clientId) &&
          item.op === "create",
      )

      if (createIndex >= 0) {
        const current = items[createIndex]
        const merged: PendingOperation = {
          ...current,
          body: mergeRecords(current.body, input.body),
          snapshot: mergeRecords(current.snapshot ?? undefined, input.snapshot ?? undefined) ?? null,
          lastError: null,
        }
        items[createIndex] = merged
        await writeOutboxState(items)
        return merged
      }
    }

    const updateIndex = items.findIndex(
      (item) =>
        matchesEntityId(item, input.entity, input.clientId) &&
        item.op === "update",
    )

    if (updateIndex >= 0) {
      const current = items[updateIndex]
      const merged: PendingOperation = {
        ...current,
        body: mergeRecords(current.body, input.body),
        snapshot: mergeRecords(current.snapshot ?? undefined, input.snapshot ?? undefined) ?? null,
        lastError: null,
      }
      items[updateIndex] = merged
      await writeOutboxState(items)
      return merged
    }
  }

  if (input.op === "delete") {
    items = items.filter(
      (item) =>
        !(
          matchesEntityId(item, input.entity, input.clientId) &&
          item.op === "update"
        ),
    )

    const existingDelete = items.find(
      (item) =>
        matchesEntityId(item, input.entity, input.clientId) &&
        item.op === "delete",
    )

    if (existingDelete) {
      return existingDelete
    }
  }

  items.push(nextBase)
  await writeOutboxState(items)
  return nextBase
}

async function doFlushPendingOperations(
  apiFetch: ApiFetchLike,
): Promise<FlushPendingOperationsResult> {
  let items = await readPendingOperations()
  let synced = 0

  for (const item of items) {
    try {
      let response: unknown = undefined

      if (item.method === "DELETE") {
        await apiFetch<void>(item.path, {
          method: item.method,
        })
      } else {
        response = await apiFetch<unknown>(item.path, {
          method: item.method,
          body: JSON.stringify(item.body ?? {}),
          headers: { "Content-Type": "application/json" },
        })
      }

      if (item.op === "create" && isLocalId(item.clientId)) {
        const serverId = extractResponseId(response)
        if (!serverId) {
          items = items.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  retryCount: current.retryCount + 1,
                  lastError: "Resposta do servidor sem id para reconciliar a fila local.",
                }
              : current,
          )
          await writeOutboxState(items)
          return {
            synced,
            remaining: items.length,
            failedOperationId: item.id,
          }
        }

        items = items
          .filter((current) => current.id !== item.id)
          .map((current) => replaceInOperation(current, item.clientId, serverId))
      } else {
        items = items.filter((current) => current.id !== item.id)
      }

      synced += 1
      await writeOutboxState(items)
    } catch (error) {
      if (isOfflineLikeError(error)) {
        return {
          synced,
          remaining: items.length,
        }
      }

      const message = error instanceof Error ? error.message : "Falha ao sincronizar operacao pendente"
      items = items.map((current) =>
        current.id === item.id
          ? {
              ...current,
              retryCount: current.retryCount + 1,
              lastError: message,
            }
          : current,
      )
      await writeOutboxState(items)
      return {
        synced,
        remaining: items.length,
        failedOperationId: item.id,
      }
    }
  }

  return {
    synced,
    remaining: items.length,
  }
}

export async function flushPendingOperations(
  apiFetch: ApiFetchLike,
): Promise<FlushPendingOperationsResult> {
  if (activeFlushPromise) {
    return await activeFlushPromise
  }

  activeFlushPromise = doFlushPendingOperations(apiFetch).finally(() => {
    activeFlushPromise = null
  })

  return await activeFlushPromise
}

export function applyPendingEntityOperations<T extends { id: string }>(
  items: T[],
  operations: PendingOperation[],
  entity: OfflineEntity,
  options?: {
    shouldIncludeSnapshot?: (snapshot: T, operation: PendingOperation) => boolean
    merge?: (current: T | null, snapshot: T, operation: PendingOperation) => T
    sort?: (a: T, b: T) => number
  },
) {
  let next = [...items]

  for (const operation of operations.filter((item) => item.entity === entity).sort(sortByCreatedAt)) {
    if (operation.op === "delete") {
      next = next.filter((item) => item.id !== operation.clientId)
      continue
    }

    const snapshot = operation.snapshot as T | null | undefined
    if (!snapshot || typeof snapshot !== "object" || typeof snapshot.id !== "string") {
      continue
    }

    if (options?.shouldIncludeSnapshot && !options.shouldIncludeSnapshot(snapshot, operation)) {
      next = next.filter((item) => item.id !== operation.clientId && item.id !== snapshot.id)
      continue
    }

    const index = next.findIndex(
      (item) => item.id === operation.clientId || item.id === snapshot.id,
    )

    if (index >= 0) {
      const current = next[index]
      next[index] = options?.merge
        ? options.merge(current, snapshot, operation)
        : ({ ...current, ...snapshot } as T)
    } else {
      next.unshift(snapshot)
    }
  }

  if (options?.sort) {
    next.sort(options.sort)
  }

  return next
}
