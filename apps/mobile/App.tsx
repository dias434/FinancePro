import * as React from "react"
import { StatusBar } from "expo-status-bar"

import { AuthProvider } from "./src/auth/auth-context"
import { AppNavigator } from "./src/navigation/app-navigator"
import { MobilePushNotifications } from "./src/notifications/mobile-push-notifications"

export default function App() {
  return (
    <AuthProvider>
      <MobilePushNotifications />
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  )
}
