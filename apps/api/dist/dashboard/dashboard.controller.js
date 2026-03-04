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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const access_guard_1 = require("../auth/guards/access.guard");
const dashboard_advanced_query_1 = require("./dto/dashboard-advanced.query");
const dashboard_summary_query_1 = require("./dto/dashboard-summary.query");
const dashboard_service_1 = require("./dashboard.service");
let DashboardController = class DashboardController {
    dashboard;
    constructor(dashboard) {
        this.dashboard = dashboard;
    }
    summary(req, query) {
        return this.dashboard.getSummary({
            userId: req.user.sub,
            range: query.range,
            year: query.year,
            month: query.month,
            accountId: query.accountId,
            baseCurrency: query.baseCurrency,
            page: query.page,
            pageSize: query.pageSize,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
        });
    }
    advanced(req, query) {
        return this.dashboard.getAdvancedReport({
            userId: req.user.sub,
            baseCurrency: query.baseCurrency,
        });
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)("summary"),
    (0, common_1.UseGuards)(access_guard_1.AccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dashboard_summary_query_1.DashboardSummaryQueryDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)("advanced"),
    (0, common_1.UseGuards)(access_guard_1.AccessGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dashboard_advanced_query_1.DashboardAdvancedQueryDto]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "advanced", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)("dashboard"),
    __param(0, (0, common_1.Inject)(dashboard_service_1.DashboardService)),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
