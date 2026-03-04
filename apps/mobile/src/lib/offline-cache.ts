import * as SecureStore from "expo-secure-store"

const CACHE_PREFIX = "fp_cache"
const META_SUFFIX = "meta"
const CHUNK_SIZE = 1800

type CacheMeta = {
  count: number
}

export type OfflineCacheEntry<T> = {
  value: T
  updatedAt: string
}

function hashKey(input: string) {
  let hash = 2166136261

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24)
  }

  return (hash >>> 0).toString(36)
}

function getBaseKey(key: string) {
  return `${CACHE_PREFIX}_${hashKey(key)}`
}

function getMetaKey(key: string) {
  return `${getBaseKey(key)}_${META_SUFFIX}`
}

function getChunkKey(key: string, index: number) {
  return `${getBaseKey(key)}_${index}`
}

async function readMeta(key: string): Promise<CacheMeta | null> {
  let raw: string | null
  try {
    raw = await SecureStore.getItemAsync(getMetaKey(key))
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<CacheMeta>
    const count = parsed.count
    if (typeof count !== "number" || !Number.isInteger(count) || count <= 0) return null
    return { count }
  } catch {
    return null
  }
}

export async function readOfflineCache<T>(key: string): Promise<OfflineCacheEntry<T> | null> {
  const meta = await readMeta(key)
  if (!meta) return null

  let serialized = ""

  for (let i = 0; i < meta.count; i += 1) {
    let chunk: string | null
    try {
      chunk = await SecureStore.getItemAsync(getChunkKey(key, i))
    } catch {
      return null
    }
    if (!chunk) return null
    serialized += chunk
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<OfflineCacheEntry<T>>
    if (typeof parsed.updatedAt !== "string" || !("value" in parsed)) {
      return null
    }

    return {
      value: parsed.value as T,
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

export async function writeOfflineCache<T>(key: string, value: T): Promise<OfflineCacheEntry<T>> {
  const entry: OfflineCacheEntry<T> = {
    value,
    updatedAt: new Date().toISOString(),
  }

  const serialized = JSON.stringify(entry)
  const chunks: string[] = []

  for (let index = 0; index < serialized.length; index += CHUNK_SIZE) {
    chunks.push(serialized.slice(index, index + CHUNK_SIZE))
  }

  try {
    const previousMeta = await readMeta(key)

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(getChunkKey(key, index), chunk),
      ),
    )

    if (previousMeta && previousMeta.count > chunks.length) {
      await Promise.all(
        Array.from({ length: previousMeta.count - chunks.length }, (_, offset) =>
          SecureStore.deleteItemAsync(getChunkKey(key, chunks.length + offset)),
        ),
      )
    }

    await SecureStore.setItemAsync(
      getMetaKey(key),
      JSON.stringify({ count: chunks.length } satisfies CacheMeta),
    )
  } catch {
    return entry
  }

  return entry
}

export function formatOfflineTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("pt-BR")
}
