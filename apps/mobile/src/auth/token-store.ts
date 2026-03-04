import * as SecureStore from "expo-secure-store"

const KEYS = {
  access: "fp_access",
  refresh: "fp_refresh",
  user: "fp_user",
} as const

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type StoredAuthUser = {
  id: string
  email: string
  name?: string | null
}

export async function getTokens(): Promise<AuthTokens | null> {
  const accessToken = await SecureStore.getItemAsync(KEYS.access)
  const refreshToken = await SecureStore.getItemAsync(KEYS.refresh)
  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}

export async function setTokens(tokens: AuthTokens) {
  await SecureStore.setItemAsync(KEYS.access, tokens.accessToken)
  await SecureStore.setItemAsync(KEYS.refresh, tokens.refreshToken)
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(KEYS.access)
  await SecureStore.deleteItemAsync(KEYS.refresh)
}

export async function getStoredUser(): Promise<StoredAuthUser | null> {
  const raw = await SecureStore.getItemAsync(KEYS.user)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthUser>
    if (typeof parsed.id !== "string" || typeof parsed.email !== "string") {
      return null
    }

    return {
      id: parsed.id,
      email: parsed.email,
      name: typeof parsed.name === "string" || parsed.name === null ? parsed.name : null,
    }
  } catch {
    return null
  }
}

export async function setStoredUser(user: StoredAuthUser) {
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user))
}

export async function clearStoredUser() {
  await SecureStore.deleteItemAsync(KEYS.user)
}
