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
exports.AlertsController = void 0;
const common_1 = require("@nestjs/common");
const access_guard_1 = require("../auth/guards/access.guard");
const alert_list_query_1 = require("./dto/alert-list.query");
const deactivate_push_device_dto_1 = require("./dto/deactivate-push-device.dto");
const register_push_device_dto_1 = require("./dto/register-push-device.dto");
const alerts_service_1 = require("./alerts.service");
const push_notifications_service_1 = require("./push-notifications.service");
let AlertsController = class AlertsController {
    alerts;
    pushNotifications;
    constructor(alerts, pushNotifications) {
        this.alerts = alerts;
        this.pushNotifications = pushNotifications;
    }
    list(req, query) {
        return this.alerts.list(req.user.sub, {
            page: query.page,
            pageSize: query.pageSize,
            status: query.status,
            type: query.type,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
        });
    }
    readAll(req) {
        return this.alerts.readAll(req.user.sub);
    }
    registerPushDevice(req, body) {
        return this.pushNotifications.registerDevice(req.user.sub, body);
    }
    deactivatePushDevice(req, body) {
        return this.pushNotifications.deactivateDevice(req.user.sub, body.token);
    }
    markRead(req, id) {
        return this.alerts.markRead(req.user.sub, id);
    }
    markUnread(req, id) {
        return this.alerts.markUnread(req.user.sub, id);
    }
    resolve(req, id) {
        return this.alerts.resolve(req.user.sub, id);
    }
};
exports.AlertsController = AlertsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, alert_list_query_1.AlertListQueryDto]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)("read-all"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "readAll", null);
__decorate([
    (0, common_1.Post)("push-devices"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_push_device_dto_1.RegisterPushDeviceDto]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "registerPushDevice", null);
__decorate([
    (0, common_1.Post)("push-devices/deactivate"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, deactivate_push_device_dto_1.DeactivatePushDeviceDto]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "deactivatePushDevice", null);
__decorate([
    (0, common_1.Patch)(":id/read"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Patch)(":id/unread"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "markUnread", null);
__decorate([
    (0, common_1.Patch)(":id/resolve"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AlertsController.prototype, "resolve", null);
exports.AlertsController = AlertsController = __decorate([
    (0, common_1.Controller)("alerts"),
    (0, common_1.UseGuards)(access_guard_1.AccessGuard),
    __param(0, (0, common_1.Inject)(alerts_service_1.AlertsService)),
    __param(1, (0, common_1.Inject)(push_notifications_service_1.PushNotificationsService)),
    __metadata("design:paramtypes", [alerts_service_1.AlertsService,
        push_notifications_service_1.PushNotificationsService])
], AlertsController);
