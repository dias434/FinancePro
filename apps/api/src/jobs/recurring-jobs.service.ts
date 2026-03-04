import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

import { RecurringService } from "../recurring/recurring.service"

function parseBoolean(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback
  const normalized = String(value).trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true
  if (normalized === "false" || normalized === "0" || normalized === "no") return false
  return fallback
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return parsed
}

@Injectable()
export class RecurringJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecurringJobsService.name)
  private timer: NodeJS.Timeout | null = null
  private readonly jobsEnabled: boolean
  private readonly intervalMinutes: number

  constructor(
    @Inject(RecurringService) private readonly recurring: RecurringService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    this.jobsEnabled = parseBoolean(this.config.get("JOBS_ENABLED"), true)
    this.intervalMinutes = parsePositiveInt(this.config.get("JOBS_RECURRING_INTERVAL_MINUTES"), 60)
  }

  onModuleInit() {
    if (!this.jobsEnabled) {
      this.logger.log("Jobs de recorrencia desativados (JOBS_ENABLED=false).")
      return
    }
    this.logger.log(`Jobs de recorrencia ativados: intervalo=${this.intervalMinutes}m`)
    void this.runRecurring("startup")
    this.timer = setInterval(() => {
      void this.runRecurring("interval")
    }, this.intervalMinutes * 60_000)
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  private async runRecurring(source: "startup" | "interval") {
    try {
      const { processed } = await this.recurring.processDueRecurring()
      if (processed > 0 || source === "startup") {
        this.logger.log(`[recurring/${source}] processados=${processed}`)
      }
    } catch (error) {
      this.logger.error(
        `[recurring/${source}] erro ao processar recorrentes`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
