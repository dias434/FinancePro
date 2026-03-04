import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"

import { AccessGuard } from "../auth/guards/access.guard"
import { ExportTransactionsQueryDto } from "./dto/export-transactions.query"
import { ImportLogsQueryDto } from "./dto/import-logs.query"
import { PreviewImportDto } from "./dto/preview-import.dto"
import { RunMonthlyBackupDto } from "./dto/run-monthly-backup.dto"
import { RunImportDto } from "./dto/run-import.dto"
import { IMPORT_MAX_FILE_SIZE_BYTES, ImportsService } from "./imports.service"

const uploadOptions = {
  limits: {
    fileSize: IMPORT_MAX_FILE_SIZE_BYTES,
    files: 1,
  },
}

@Controller("imports")
@UseGuards(AccessGuard)
export class ImportsController {
  constructor(@Inject(ImportsService) private readonly imports: ImportsService) {}

  @Post("preview")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  preview(@Req() req: any, @UploadedFile() file: any, @Body() dto: PreviewImportDto) {
    return this.imports.previewImport(req.user.sub, file, dto)
  }

  @Post("run")
  @UseInterceptors(FileInterceptor("file", uploadOptions))
  run(@Req() req: any, @UploadedFile() file: any, @Body() dto: RunImportDto) {
    return this.imports.runImport(req.user.sub, file, dto)
  }

  @Get("logs")
  listLogs(@Req() req: any, @Query() query: ImportLogsQueryDto) {
    return this.imports.listLogs(req.user.sub, query)
  }

  @Get("logs/:id")
  getLog(@Req() req: any, @Param("id") id: string, @Query("itemLimit") itemLimitRaw?: string) {
    const itemLimit = itemLimitRaw ? Number(itemLimitRaw) : undefined
    return this.imports.getLog(req.user.sub, id, itemLimit)
  }

  @Post("logs/:id/replay")
  replay(@Req() req: any, @Param("id") id: string) {
    return this.imports.replayLog(req.user.sub, id)
  }

  @Post("logs/:id/rollback")
  rollback(@Req() req: any, @Param("id") id: string) {
    return this.imports.rollbackLog(req.user.sub, id)
  }

  @Get("backups")
  listBackups(@Req() req: any) {
    return this.imports.listMonthlyBackups(req.user.sub)
  }

  @Post("backups/run")
  runMonthlyBackup(@Req() req: any, @Body() dto: RunMonthlyBackupDto) {
    return this.imports.runMonthlyBackup(req.user.sub, dto)
  }

  @Get("export")
  async exportTransactions(
    @Req() req: any,
    @Query() query: ExportTransactionsQueryDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.imports.exportTransactions(req.user.sub, query)

    if ((query.mode ?? "download") === "json") {
      return result
    }

    res.setHeader("Content-Type", result.mimeType)
    res.setHeader("Content-Disposition", `attachment; filename=\"${result.fileName}\"`)
    res.setHeader("Cache-Control", "no-store")
    return result.content
  }
}
