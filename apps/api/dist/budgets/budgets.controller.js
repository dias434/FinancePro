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
exports.BudgetsController = void 0;
const common_1 = require("@nestjs/common");
const access_guard_1 = require("../auth/guards/access.guard");
const budgets_service_1 = require("./budgets.service");
const budget_list_query_1 = require("./dto/budget-list.query");
const create_budget_dto_1 = require("./dto/create-budget.dto");
const update_budget_dto_1 = require("./dto/update-budget.dto");
let BudgetsController = class BudgetsController {
    budgets;
    constructor(budgets) {
        this.budgets = budgets;
    }
    list(req, query) {
        return this.budgets.list(req.user.sub, {
            page: query.page,
            pageSize: query.pageSize,
            q: query.q,
            categoryId: query.categoryId,
            year: query.year,
            month: query.month,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
        });
    }
    create(req, dto) {
        return this.budgets.create(req.user.sub, dto);
    }
    update(req, id, dto) {
        return this.budgets.update(req.user.sub, id, dto);
    }
    remove(req, id) {
        return this.budgets.remove(req.user.sub, id);
    }
};
exports.BudgetsController = BudgetsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, budget_list_query_1.BudgetListQueryDto]),
    __metadata("design:returntype", void 0)
], BudgetsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_budget_dto_1.CreateBudgetDto]),
    __metadata("design:returntype", void 0)
], BudgetsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_budget_dto_1.UpdateBudgetDto]),
    __metadata("design:returntype", void 0)
], BudgetsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BudgetsController.prototype, "remove", null);
exports.BudgetsController = BudgetsController = __decorate([
    (0, common_1.Controller)("budgets"),
    (0, common_1.UseGuards)(access_guard_1.AccessGuard),
    __param(0, (0, common_1.Inject)(budgets_service_1.BudgetsService)),
    __metadata("design:paramtypes", [budgets_service_1.BudgetsService])
], BudgetsController);
