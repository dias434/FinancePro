"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const access_guard_1 = require("../auth/guards/access.guard");
const export_transactions_query_1 = require("./dto/export-transactions.query");
const import_logs_query_1 = require("./dto/import-logs.query");
const preview_import_dto_1 = require("./dto/preview-import.dto");
const run_monthly_backup_dto_1 = require("./dto/run-monthly-backup.dto");
const run_import_dto_1 = require("./dto/run-import.dto");
const imports_service_1 = require("./imports.service");
const uploadOptions = {
    limits: {
        fileSize: imports_service_1.IMPORT_MAX_FILE_SIZE_BYTES,
        files: 1,
    },
};
let ImportsController = class ImportsController {
    imports;
    constructor(imports) {
        this.imports = imports;
    }
    preview(req, file, dto) {
        return this.imports.previewImport(req.user.sub, file, dto);
    }
    run(req, file, dto) {
        return this.imports.runImport(req.user.sub, file, dto);
    }
    listLogs(req, query) {
        return this.imports.listLogs(req.user.sub, query);
    }
    getLog(req, id, itemLimitRaw) {
        const itemLimit = itemLimitRaw ? Number(itemLimitRaw) : undefined;
        return this.imports.getLog(req.user.sub, id, itemLimit);
    }
    replay(req, id) {
        return this.imports.replayLog(req.user.sub, id);
    }
    rollback(req, id) {
        return this.imports.rollbackLog(req.user.sub, id);
    }
    listBackups(req) {
        return this.imports.listMonthlyBackups(req.user.sub);
    }
    runMonthlyBackup(req, dto) {
        return this.imports.runMonthlyBackup(req.user.sub, dto);
    }
    async exportTransactions(req, query, res) {
        const result = await this.imports.exportTransactions(req.user.sub, query);
        if ((query.mode ?? "download") === "json") {
            return result;
        }
        res.setHeader("Content-Type", result.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename=\"${result.fileName}\"`);
        res.setHeader("Cache-Control", "no-store");
        return result.content;
    }
};
exports.ImportsController = ImportsController;
__decorate([
    (0, common_1.Post)("preview"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", uploadOptions)),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, preview_import_dto_1.PreviewImportDto]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)("run"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", uploadOptions)),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, run_import_dto_1.RunImportDto]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "run", null);
__decorate([
    (0, common_1.Get)("logs"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, import_logs_query_1.ImportLogsQueryDto]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "listLogs", null);
__decorate([
    (0, common_1.Get)("logs/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Query)("itemLimit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "getLog", null);
__decorate([
    (0, common_1.Post)("logs/:id/replay"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "replay", null);
__decorate([
    (0, common_1.Post)("logs/:id/rollback"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "rollback", null);
__decorate([
    (0, common_1.Get)("backups"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "listBackups", null);
__decorate([
    (0, common_1.Post)("backups/run"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, run_monthly_backup_dto_1.RunMonthlyBackupDto]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "runMonthlyBackup", null);
__decorate([
    (0, common_1.Get)("export"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, export_transactions_query_1.ExportTransactionsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ImportsController.prototype, "exportTransactions", null);
exports.ImportsController = ImportsController = __decorate([
    (0, common_1.Controller)("imports"),
    (0, common_1.UseGuards)(access_guard_1.AccessGuard),
    __param(0, (0, common_1.Inject)(imports_service_1.ImportsService)),
    __metadata("design:paramtypes", [imports_service_1.ImportsService])
], ImportsController);
