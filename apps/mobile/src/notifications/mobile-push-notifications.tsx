import * as React from "react"
import { AppState, Platform } from "react-native"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"

import { useAuth } from "../auth/auth-context"
import { getCurrentPushToken, setCurrentPushToken } from "./push-notification-state"

const ANDROID_PUSH_CHANNEL_ID = "financepro-alerts"

let notificationHandlerConfigured = false
let projectIdWarningShown = false

type PushTokenRequestResult =
  | { status: "registered"; token: string }
  | { status: "blocked" }
  | { status: "unavailable" }

function normalizeString(value: unknown) {
  if (typeof value !== "string") return ""
  const normalized = value.trim()
  if (/^\$\{.+\}$/.test(normalized)) return ""
  return normalized
}

function getProjectId() {
  const easProjectId = normalizeString(Constants.easConfig?.projectId)
  if (easProjectId) return easProjectId

  const expoProjectId = normalizeString(
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | null | undefined)?.eas?.projectId,
  )
  if (expoProjectId) return expoProjectId

  return normalizeString(process.env.EXPO_PUBLIC_EAS_PROJECT_ID)
}

function ensureNotificationHandler() {
  if (notificationHandlerConfigured) return

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })

  notificationHandlerConfigured = true
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return

  await Notifications.setNotificationChannelAsync(ANDROID_PUSH_CHANNEL_ID, {
    name: "Alertas FinancePro",
    importance: Notifications.AndroidImportance.MAX,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    sound: "default",
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
  })
}

async function requestExpoPushToken(): Promise<PushTokenRequestResult> {
  ensureNotificationHandler()
  await ensureAndroidChannel()

  let permissions = await Notifications.getPermissionsAsync()
  let status = permissions.status
  if (status !== "granted") {
    permissions = await Notifications.requestPermissionsAsync()
    status = permissions.status
  }

  if (status !== "granted") {
    return { status: "blocked" }
  }

  const projectId = getProjectId()
  if (!projectId) {
    if (!projectIdWarningShown) {
      console.warn("[push] EXPO_PUBLIC_EAS_PROJECT_ID ausente; push remoto fica desativado.")
      projectIdWarningShown = true
    }
    return { status: "unavailable" }
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId })
  return { status: "registered", token: token.data }
}

export function MobilePushNotifications() {
  const { user, apiFetch } = useAuth()
  const syncKeyRef = React.useRef<string | null>(null)
  const syncingRef = React.useRef(false)

  const syncRegistration = React.useCallback(async () => {
    if (!user || syncingRef.current) return

    syncingRef.current = true
    try {
      const previousToken = getCurrentPushToken()
      const result = await requestExpoPushToken()

      if (result.status === "unavailable") {
        return
      }

      if (result.status === "blocked") {
        if (previousToken) {
          await apiFetch("/alerts/push-devices/deactivate", {
            method: "POST",
            body: JSON.stringify({ token: previousToken }),
          }).catch(() => null)
        }

        setCurrentPushToken(null)
        syncKeyRef.current = null
        return
      }

      const nextToken = result.token
      const syncKey = `${user.id}:${nextToken}`
      if (syncKey !== syncKeyRef.current) {
        await apiFetch("/alerts/push-devices", {
          method: "POST",
          body: JSON.stringify({
            token: nextToken,
            platform: Platform.OS === "ios" ? "ios" : "android",
            deviceName: normalizeString(Constants.deviceName) || undefined,
          }),
        })
        syncKeyRef.current = syncKey
      }

      if (previousToken && previousToken !== nextToken) {
        await apiFetch("/alerts/push-devices/deactivate", {
          method: "POST",
          body: JSON.stringify({ token: previousToken }),
        }).catch(() => null)
      }

      setCurrentPushToken(nextToken)
    } catch (error) {
      console.warn("[push] falha ao registrar notificacoes no aparelho", error)
    } finally {
      syncingRef.current = false
    }
  }, [apiFetch, user])

  React.useEffect(() => {
    ensureNotificationHandler()
  }, [])

  React.useEffect(() => {
    if (!user) {
      syncKeyRef.current = null
      setCurrentPushToken(null)
      return
    }

    void syncRegistration()

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncRegistration()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [syncRegistration, user])

  return null
}
