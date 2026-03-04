export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(message: string, opts: { status: number; details?: unknown }) {
    super(message)
    this.name = "ApiError"
    this.status = opts.status
    this.details = opts.details
  }
}

const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 250

function getApiUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL
  if (!url) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_URL (ex: http://10.0.2.2:3001 for Android emulator)",
    )
  }
  return url.replace(/\/$/, "")
}

function getMethod(init: RequestInit) {
  return (init.method ?? "GET").toUpperCase()
}

function hasContentTypeHeader(headers: RequestInit["headers"]) {
  if (!headers) return false
  if (headers instanceof Headers) return headers.has("Content-Type")
  if (Array.isArray(headers)) return headers.some(([key]) => key.toLowerCase() === "content-type")
  return Object.keys(headers).some((key) => key.toLowerCase() === "content-type")
}

function isFormDataBody(body: RequestInit["body"]) {
  return typeof FormData !== "undefined" && body instanceof FormData
}

function canRetryRequest(init: RequestInit) {
  return RETRYABLE_METHODS.has(getMethod(init))
}

function shouldRetryStatus(status: number) {
  return RETRYABLE_STATUSES.has(status)
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError"
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function readErrorBody(res: Response) {
  let body: unknown = undefined
  try {
    body = await res.json()
  } catch {
    try {
      body = await res.text()
    } catch {
      body = undefined
    }
  }
  return body
}

export async function httpFetch<T>(
  path: string,
  init: RequestInit & { parseAs?: "json" | "text" } = {},
): Promise<T> {
  const baseUrl = getApiUrl()
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`

  const parseAs = init.parseAs ?? "json"
  const { parseAs: _parseAs, ...requestInit } = init

  const canRetry = canRetryRequest(requestInit)

  for (let attempt = 0; ; attempt += 1) {
    let res: Response
    try {
      const shouldSetJsonContentType =
        requestInit.body !== undefined &&
        !isFormDataBody(requestInit.body) &&
        typeof requestInit.body === "string" &&
        !hasContentTypeHeader(requestInit.headers)

      res = await fetch(url, {
        ...requestInit,
        headers: {
          Accept: parseAs === "text" ? "text/plain, text/csv, application/json" : "application/json",
          ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : null),
          ...(requestInit.headers ?? {}),
        },
      })
    } catch (error) {
      if (canRetry && attempt < MAX_RETRIES && !isAbortError(error)) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1))
        continue
      }
      throw error
    }

    if (!res.ok) {
      if (canRetry && attempt < MAX_RETRIES && shouldRetryStatus(res.status)) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1))
        continue
      }

      const body = await readErrorBody(res)
      const message =
        typeof body === "object" && body && "message" in body
          ? String((body as any).message)
          : `Request failed (${res.status})`

      throw new ApiError(message, { status: res.status, details: body })
    }

    if (parseAs === "text") {
      return (await res.text()) as T
    }

    if (res.status === 204) {
      return undefined as T
    }

    return (await res.json()) as T
  }
}
