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
exports.AccountsController = void 0;
const common_1 = require("@nestjs/common");
const access_guard_1 = require("../auth/guards/access.guard");
const account_list_query_1 = require("./dto/account-list.query");
const create_account_dto_1 = require("./dto/create-account.dto");
const reconcile_dto_1 = require("./dto/reconcile.dto");
const update_account_dto_1 = require("./dto/update-account.dto");
const accounts_service_1 = require("./accounts.service");
let AccountsController = class AccountsController {
    accounts;
    constructor(accounts) {
        this.accounts = accounts;
    }
    list(req, query) {
        return this.accounts.list(req.user.sub, {
            page: query.page,
            pageSize: query.pageSize,
            q: query.q,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
        });
    }
    create(req, dto) {
        return this.accounts.create(req.user.sub, dto);
    }
    listBills(req, id, limit) {
        return this.accounts.listBills(req.user.sub, id, {
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    listReconciliations(req, id, page, pageSize) {
        return this.accounts.listReconciliations(req.user.sub, id, {
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        });
    }
    get(req, id) {
        return this.accounts.get(req.user.sub, id);
    }
    update(req, id, dto) {
        return this.accounts.update(req.user.sub, id, dto);
    }
    reconcile(req, id, dto) {
        return this.accounts.reconcile(req.user.sub, id, dto);
    }
    remove(req, id) {
        return this.accounts.remove(req.user.sub, id);
    }
};
exports.AccountsController = AccountsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, account_list_query_1.AccountListQueryDto]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_account_dto_1.CreateAccountDto]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(":id/bills"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "listBills", null);
__decorate([
    (0, common_1.Get)(":id/reconciliations"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Query)("page")),
    __param(3, (0, common_1.Query)("pageSize")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "listReconciliations", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_account_dto_1.UpdateAccountDto]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(":id/reconcile"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, reconcile_dto_1.ReconcileDto]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "reconcile", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AccountsController.prototype, "remove", null);
exports.AccountsController = AccountsController = __decorate([
    (0, common_1.Controller)("accounts"),
    (0, common_1.UseGuards)(access_guard_1.AccessGuard),
    __param(0, (0, common_1.Inject)(accounts_service_1.AccountsService)),
    __metadata("design:paramtypes", [accounts_service_1.AccountsService])
], AccountsController);
