export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthUser = {
  id: string
  email: string
  name?: string | null
}

export type AuthResult = {
  user: AuthUser
} & AuthTokens

