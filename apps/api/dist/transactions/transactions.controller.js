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
exports.TransactionsController = void 0;
const common_1 = require("@nestjs/common");
const access_guard_1 = require("../auth/guards/access.guard");
const create_transaction_dto_1 = require("./dto/create-transaction.dto");
const transaction_list_query_1 = require("./dto/transaction-list.query");
const update_transaction_dto_1 = require("./dto/update-transaction.dto");
const transactions_service_1 = require("./transactions.service");
let TransactionsController = class TransactionsController {
    transactions;
    constructor(transactions) {
        this.transactions = transactions;
    }
    list(req, query) {
        return this.transactions.list(req.user.sub, {
            page: query.page,
            pageSize: query.pageSize,
            q: query.q,
            type: query.type,
            accountId: query.accountId,
            categoryId: query.categoryId,
            from: query.from,
            to: query.to,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
            limit: query.limit,
        });
    }
    create(req, dto) {
        return this.transactions.create(req.user.sub, dto);
    }
    update(req, id, dto) {
        return this.transactions.update(req.user.sub, id, dto);
    }
    remove(req, id) {
        return this.transactions.remove(req.user.sub, id);
    }
};
exports.TransactionsController = TransactionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, transaction_list_query_1.TransactionListQueryDto]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_transaction_dto_1.CreateTransactionDto]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_transaction_dto_1.UpdateTransactionDto]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TransactionsController.prototype, "remove", null);
exports.TransactionsController = TransactionsController = __decorate([
    (0, common_1.Controller)("transactions"),
    (0, common_1.UseGuards)(access_guard_1.AccessGuard),
    __param(0, (0, common_1.Inject)(transactions_service_1.TransactionsService)),
    __metadata("design:paramtypes", [transactions_service_1.TransactionsService])
], TransactionsController);
