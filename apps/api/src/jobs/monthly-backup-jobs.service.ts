import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

import { ImportsService } from "../imports/imports.service"

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
export class MonthlyBackupJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonthlyBackupJobsService.name)
  private timer: NodeJS.Timeout | null = null
  private readonly jobsEnabled: boolean
  private readonly intervalMinutes: number

  constructor(
    @Inject(ImportsService) private readonly imports: ImportsService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    this.jobsEnabled = parseBoolean(this.config.get("JOBS_ENABLED"), true)
    this.intervalMinutes = parsePositiveInt(this.config.get("JOBS_MONTHLY_BACKUP_INTERVAL_MINUTES"), 720)
  }

  onModuleInit() {
    if (!this.jobsEnabled) {
      this.logger.log("Backup mensal automatico desativado (JOBS_ENABLED=false).")
      return
    }

    this.logger.log(`Backup mensal automatico ativado: intervalo=${this.intervalMinutes}m`)
    void this.runBackups("startup")

    this.timer = setInterval(() => {
      void this.runBackups("interval")
    }, this.intervalMinutes * 60_000)
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  private async runBackups(source: "startup" | "interval") {
    try {
      const result = await this.imports.runAutomaticMonthlyBackups()
      if (source === "startup" || result.created > 0) {
        this.logger.log(
          `[monthly-backup/${source}] mes=${result.monthKey} usuarios=${result.users} criados=${result.created} ignorados=${result.skipped}`,
        )
      }
    } catch (error) {
      this.logger.error(
        `[monthly-backup/${source}] erro ao gerar backups mensais`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
