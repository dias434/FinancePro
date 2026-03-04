export const AUTH_COOKIES = {
  access: "fp_access",
  refresh: "fp_refresh",
} as const

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 15
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

