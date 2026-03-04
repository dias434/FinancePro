export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(message: string, opts: { status: number; code?: string; details?: unknown }) {
    super(message)
    this.name = "ApiError"
    this.status = opts.status
    this.code = opts.code
    this.details = opts.details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

