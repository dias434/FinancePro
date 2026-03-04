import * as React from "react"

import { ApiError, httpFetch } from "../api/http"
import { getCurrentPushToken, setCurrentPushToken } from "../notifications/push-notification-state"
import {
  clearStoredUser,
  clearTokens,
  getStoredUser,
  getTokens,
  setStoredUser,
  setTokens,
  type AuthTokens,
} from "./token-store"

export type AuthUser = {
  id: string
  email: string
  name?: string | null
}

type AuthState = {
  initializing: boolean
  user: AuthUser | null
  tokens: AuthTokens | null
}

type AuthContextValue = AuthState & {
  signIn(input: { email: string; password: string }): Promise<void>
  signUp(input: { email: string; password: string; name?: string }): Promise<void>
  signOut(): Promise<void>
  apiFetch<T>(path: string, init?: RequestInit & { parseAs?: "json" | "text" }): Promise<T>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />")
  return ctx
}

async function me(accessToken: string): Promise<AuthUser> {
  return await httpFetch<AuthUser>("/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
}

async function refresh(refreshToken: string): Promise<AuthTokens> {
  return await httpFetch<AuthTokens>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  })
}

function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401
}

async function persistSession(tokens: AuthTokens, user: AuthUser) {
  await Promise.all([setTokens(tokens), setStoredUser(user)])
}

async function clearPersistedSession() {
  await Promise.all([clearTokens(), clearStoredUser()])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    initializing: true,
    user: null,
    tokens: null,
  })

  React.useEffect(() => {
    let alive = true

    Promise.all([getTokens(), getStoredUser()])
      .then(async ([tokens, storedUser]) => {
        if (!alive) return
        if (!tokens) {
          setState({ initializing: false, user: null, tokens: null })
          return
        }

        try {
          const user = await me(tokens.accessToken)
          await setStoredUser(user)
          if (!alive) return
          setState({ initializing: false, user, tokens })
          return
        } catch (error) {
          if (!isUnauthorizedError(error)) {
            if (!alive) return
            if (storedUser) {
              setState({ initializing: false, user: storedUser, tokens })
            } else {
              setState({ initializing: false, user: null, tokens: null })
            }
            return
          }
        }

        try {
          const nextTokens = await refresh(tokens.refreshToken)

          try {
            const user = await me(nextTokens.accessToken)
            await persistSession(nextTokens, user)
            if (!alive) return
            setState({ initializing: false, user, tokens: nextTokens })
            return
          } catch (error) {
            if (isUnauthorizedError(error)) {
              await clearPersistedSession()
              if (!alive) return
              setState({ initializing: false, user: null, tokens: null })
              return
            }

            await setTokens(nextTokens)
            if (!alive) return
            if (storedUser) {
              setState({ initializing: false, user: storedUser, tokens: nextTokens })
            } else {
              setState({ initializing: false, user: null, tokens: null })
            }
            return
          }
        } catch (error) {
          if (isUnauthorizedError(error)) {
            await clearPersistedSession()
            if (!alive) return
            setState({ initializing: false, user: null, tokens: null })
            return
          }

          if (!alive) return
          if (storedUser) {
            setState({ initializing: false, user: storedUser, tokens })
          } else {
            setState({ initializing: false, user: null, tokens: null })
          }
        }
      })
      .catch(() => {
        if (!alive) return
        setState({ initializing: false, user: null, tokens: null })
      })

    return () => {
      alive = false
    }
  }, [])

  const apiFetch = React.useCallback<AuthContextValue["apiFetch"]>(
    async (path, init = {}) => {
      const accessToken = state.tokens?.accessToken
      try {
        return await httpFetch(path, {
          ...init,
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : null),
            ...(init.headers ?? {}),
          },
        })
      } catch (error) {
        if (!isUnauthorizedError(error)) throw error

        const refreshToken = state.tokens?.refreshToken
        if (!refreshToken) {
          await clearPersistedSession()
          setState({ initializing: false, user: null, tokens: null })
          throw error
        }

        let nextTokens: AuthTokens
        try {
          nextTokens = await refresh(refreshToken)
          await setTokens(nextTokens)
        } catch (refreshError) {
          if (isUnauthorizedError(refreshError)) {
            await clearPersistedSession()
            setState({ initializing: false, user: null, tokens: null })
          }
          throw refreshError
        }

        let nextUser = state.user
        try {
          const user = await me(nextTokens.accessToken)
          nextUser = user
          await setStoredUser(user)
        } catch (meError) {
          if (isUnauthorizedError(meError)) {
            await clearPersistedSession()
            setState({ initializing: false, user: null, tokens: null })
            throw meError
          }
        }

        setState((s) => ({
          ...s,
          initializing: false,
          user: nextUser ?? s.user,
          tokens: nextTokens,
        }))

        try {
          return await httpFetch(path, {
            ...init,
            headers: {
              Authorization: `Bearer ${nextTokens.accessToken}`,
              ...(init.headers ?? {}),
            },
          })
        } catch (retryError) {
          if (isUnauthorizedError(retryError)) {
            await clearPersistedSession()
            setState({ initializing: false, user: null, tokens: null })
          }
          throw retryError
        }
      }
    },
    [state.tokens, state.user],
  )

  const signIn = React.useCallback<AuthContextValue["signIn"]>(
    async (input) => {
      const result = await httpFetch<{ user: AuthUser } & AuthTokens>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      })

      const tokens = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }

      await persistSession(tokens, result.user)
      setState({ initializing: false, user: result.user, tokens })
    },
    [],
  )

  const signUp = React.useCallback<AuthContextValue["signUp"]>(
    async (input) => {
      const result = await httpFetch<{ user: AuthUser } & AuthTokens>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      })

      const tokens = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }

      await persistSession(tokens, result.user)
      setState({ initializing: false, user: result.user, tokens })
    },
    [],
  )

  const signOut = React.useCallback<AuthContextValue["signOut"]>(async () => {
    const accessToken = state.tokens?.accessToken
    const refreshToken = state.tokens?.refreshToken
    const pushToken = getCurrentPushToken()

    const remoteCalls: Array<Promise<unknown>> = []
    if (accessToken && pushToken) {
      remoteCalls.push(
        httpFetch("/alerts/push-devices/deactivate", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ token: pushToken }),
        }).catch(() => null),
      )
    }

    if (refreshToken) {
      remoteCalls.push(
        httpFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        }).catch(() => null),
      )
    }

    setCurrentPushToken(null)
    await clearPersistedSession()
    setState({ initializing: false, user: null, tokens: null })

    if (remoteCalls.length > 0) {
      await Promise.allSettled(remoteCalls)
    }
  }, [state.tokens])

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    apiFetch,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
