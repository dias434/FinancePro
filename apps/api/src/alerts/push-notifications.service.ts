import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

import { PrismaService } from "../prisma/prisma.service"

type RegisterPushDeviceInput = {
  token: string
  platform: "android" | "ios"
  deviceName?: string
}

export type PushAlertNotificationInput = {
  dedupeKey: string
  userId: string
  sourceId: string
  type: string
  title: string
  message: string
  payload?: unknown
}

type ExpoPushMessage = {
  to: string
  title: string
  body: string
  sound: "default"
  channelId: string
  priority: "high"
  data: Record<string, unknown>
}

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send"
const EXPO_PUSH_BATCH_SIZE = 100
const ANDROID_CHANNEL_ID = "financepro-alerts"

function normalizeString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function toNullableTrimmed(value: unknown) {
  const normalized = normalizeString(value)
  return normalized || null
}

function isExpoPushToken(value: string) {
  return /^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(value)
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async registerDevice(userId: string, input: RegisterPushDeviceInput) {
    const token = normalizeString(input.token)
    if (!isExpoPushToken(token)) {
      throw new BadRequestException({
        code: "ALERT_PUSH_INVALID_TOKEN",
        message: "Invalid Expo push token",
      })
    }

    const now = new Date()
    await this.prisma.pushNotificationDevice.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform: input.platform,
        deviceName: toNullableTrimmed(input.deviceName),
        isActive: true,
        lastRegisteredAt: now,
      },
      update: {
        userId,
        platform: input.platform,
        deviceName: toNullableTrimmed(input.deviceName),
        isActive: true,
        disabledAt: null,
        lastRegisteredAt: now,
      },
    })

    return { ok: true }
  }

  async deactivateDevice(userId: string, rawToken: string) {
    const token = normalizeString(rawToken)
    if (!token) {
      return { ok: true, updated: 0 }
    }

    const result = await this.prisma.pushNotificationDevice.updateMany({
      where: { userId, token },
      data: {
        isActive: false,
        disabledAt: new Date(),
      },
    })

    return { ok: true, updated: result.count }
  }

  async sendSystemAlerts(alerts: PushAlertNotificationInput[]) {
    if (alerts.length === 0) return

    const groupedByUser = new Map<string, PushAlertNotificationInput[]>()
    for (const alert of alerts) {
      const existing = groupedByUser.get(alert.userId)
      if (existing) {
        existing.push(alert)
      } else {
        groupedByUser.set(alert.userId, [alert])
      }
    }

    const devices = await this.prisma.pushNotificationDevice.findMany({
      where: {
        userId: { in: Array.from(groupedByUser.keys()) },
        isActive: true,
      },
      select: {
        userId: true,
        token: true,
      },
    })
    if (devices.length === 0) return

    const malformedTokens = devices.filter((device) => !isExpoPushToken(device.token)).map((device) => device.token)
    if (malformedTokens.length > 0) {
      await this.deactivateTokens(malformedTokens)
    }

    const messages: Array<{ token: string; payload: ExpoPushMessage }> = []
    for (const device of devices) {
      if (!isExpoPushToken(device.token)) continue

      const userAlerts = groupedByUser.get(device.userId)
      if (!userAlerts || userAlerts.length === 0) continue

      if (userAlerts.length === 1) {
        const [alert] = userAlerts
        messages.push({
          token: device.token,
          payload: {
            to: device.token,
            title: alert.title,
            body: alert.message,
            sound: "default",
            channelId: ANDROID_CHANNEL_ID,
            priority: "high",
            data: {
              source: "system-alert",
              count: 1,
              type: alert.type,
              sourceId: alert.sourceId,
              dedupeKey: alert.dedupeKey,
              payload: alert.payload ?? null,
            },
          },
        })
        continue
      }

      messages.push({
        token: device.token,
        payload: {
          to: device.token,
          title: `${userAlerts.length} novos alertas`,
          body: "Voce recebeu novos alertas no FinancePro. Abra o app para ver os detalhes.",
          sound: "default",
          channelId: ANDROID_CHANNEL_ID,
          priority: "high",
          data: {
            source: "system-alert",
            count: userAlerts.length,
            types: Array.from(new Set(userAlerts.map((item) => item.type))),
            dedupeKeys: userAlerts.slice(0, 10).map((item) => item.dedupeKey),
          },
        },
      })
    }

    if (messages.length === 0) return

    for (const batch of chunkArray(messages, EXPO_PUSH_BATCH_SIZE)) {
      await this.sendBatch(batch)
    }
  }

  private async sendBatch(batch: Array<{ token: string; payload: ExpoPushMessage }>) {
    const expoPushAccessToken = normalizeString(this.config.get("EXPO_PUSH_ACCESS_TOKEN"))

    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
          ...(expoPushAccessToken ? { Authorization: `Bearer ${expoPushAccessToken}` } : null),
        },
        body: JSON.stringify(batch.map((item) => item.payload)),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => "")
        this.logger.warn(
          `[push] falha ao enviar notificacoes status=${response.status} body=${body.slice(0, 300)}`,
        )
        return
      }

      const body = (await response.json().catch(() => null)) as
        | { data?: Array<{ status?: string; details?: { error?: string } }> }
        | null

      const tickets = Array.isArray(body?.data) ? body.data : []
      const staleTokens: string[] = []

      for (let index = 0; index < tickets.length; index += 1) {
        const ticket = tickets[index]
        if (ticket?.status !== "error") continue
        if (ticket.details?.error !== "DeviceNotRegistered") continue

        const message = batch[index]
        if (message) staleTokens.push(message.token)
      }

      if (staleTokens.length > 0) {
        await this.deactivateTokens(staleTokens)
      }
    } catch (error) {
      this.logger.warn(
        `[push] erro ao enviar notificacoes: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async deactivateTokens(tokens: string[]) {
    if (tokens.length === 0) return

    await this.prisma.pushNotificationDevice.updateMany({
      where: {
        token: { in: Array.from(new Set(tokens)) },
      },
      data: {
        isActive: false,
        disabledAt: new Date(),
      },
    })
  }
}
