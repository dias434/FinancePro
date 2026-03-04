let currentPushToken: string | null = null

export function getCurrentPushToken() {
  return currentPushToken
}

export function setCurrentPushToken(token: string | null) {
  currentPushToken = token
}
