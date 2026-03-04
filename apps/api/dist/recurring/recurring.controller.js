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
exports.RecurringController = void 0;
const common_1 = require("@nestjs/common");
const access_guard_1 = require("../auth/guards/access.guard");
const create_recurring_dto_1 = require("./dto/create-recurring.dto");
const update_recurring_dto_1 = require("./dto/update-recurring.dto");
const recurring_service_1 = require("./recurring.service");
let RecurringController = class RecurringController {
    recurring;
    constructor(recurring) {
        this.recurring = recurring;
    }
    list(req, page, pageSize, status) {
        return this.recurring.list(req.user.sub, {
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
            status,
        });
    }
    create(req, dto) {
        return this.recurring.create(req.user.sub, dto);
    }
    update(req, id, dto) {
        return this.recurring.update(req.user.sub, id, dto);
    }
    pause(req, id) {
        return this.recurring.pause(req.user.sub, id);
    }
    resume(req, id) {
        return this.recurring.resume(req.user.sub, id);
    }
    cancel(req, id) {
        return this.recurring.cancel(req.user.sub, id);
    }
    remove(req, id) {
        return this.recurring.remove(req.user.sub, id);
    }
};
exports.RecurringController = RecurringController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("page")),
    __param(2, (0, common_1.Query)("pageSize")),
    __param(3, (0, common_1.Query)("status")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], RecurringController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_recurring_dto_1.CreateRecurringDto]),
    __metadata("design:returntype", void 0)
], RecurringController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_recurring_dto_1.UpdateRecurringDto]),
    __metadata("design:returntype", void 0)
], RecurringController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(":id/pause"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecurringController.prototype, "pause", null);
__decorate([
    (0, common_1.Post)(":id/resume"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecurringController.prototype, "resume", null);
__decorate([
    (0, common_1.Post)(":id/cancel"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecurringController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecurringController.prototype, "remove", null);
exports.RecurringController = RecurringController = __decorate([
    (0, common_1.Controller)("recurring"),
    (0, common_1.UseGuards)(access_guard_1.AccessGuard),
    __param(0, (0, common_1.Inject)(recurring_service_1.RecurringService)),
    __metadata("design:paramtypes", [recurring_service_1.RecurringService])
], RecurringController);
