import "server-only"

function getBackendUrl() {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : undefined)

  if (!raw) {
    throw new Error("Missing NEXT_PUBLIC_API_URL (backend base url)")
  }

  let url = raw.trim().replace(/\/$/, "")
  if (!/^https?:\/\//.test(url)) {
    if (process.env.NODE_ENV !== "production") {
      url = `http://${url}`
    } else {
      throw new Error(`Invalid backend url: ${url}`)
    }
  }

  return url
}

export async function backendFetch(path: string, init: RequestInit) {
  const base = getBackendUrl()
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`
  return fetch(url, init)
}
