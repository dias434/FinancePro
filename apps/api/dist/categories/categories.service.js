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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const pagination_query_1 = require("../common/dto/pagination.query");
const prisma_service_1 = require("../prisma/prisma.service");
function toIso(date) {
    return date.toISOString();
}
let CategoriesService = class CategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(userId, input) {
        const { skip, take } = (0, pagination_query_1.getSkipTake)({
            page: input.page,
            pageSize: input.pageSize,
            defaultPage: 1,
            defaultPageSize: 50,
            maxPageSize: 200,
        });
        const where = {
            userId,
            ...(input.type ? { type: input.type } : null),
            ...(input.q ? { name: { contains: input.q, mode: "insensitive" } } : null),
        };
        const sortBy = input.sortBy ?? "createdAt";
        const sortDir = input.sortDir ?? "desc";
        const [total, categories] = await this.prisma.$transaction([
            this.prisma.category.count({ where }),
            this.prisma.category.findMany({
                where,
                orderBy: { [sortBy]: sortDir },
                skip,
                take,
            }),
        ]);
        return {
            page: Math.floor(skip / take) + 1,
            pageSize: take,
            total,
            items: categories.map((c) => ({
                id: c.id,
                name: c.name,
                type: c.type,
                icon: c.icon ?? undefined,
                color: c.color ?? undefined,
                createdAt: toIso(c.createdAt),
                updatedAt: toIso(c.updatedAt),
            })),
        };
    }
    async create(userId, input) {
        try {
            const created = await this.prisma.category.create({
                data: {
                    userId,
                    name: input.name.trim(),
                    type: input.type ?? client_1.CategoryType.EXPENSE,
                    icon: input.icon,
                    color: input.color,
                },
            });
            return {
                id: created.id,
                name: created.name,
                type: created.type,
                icon: created.icon ?? undefined,
                color: created.color ?? undefined,
                createdAt: toIso(created.createdAt),
                updatedAt: toIso(created.updatedAt),
            };
        }
        catch (error) {
            const prismaCode = error?.code;
            if (prismaCode === "P2002") {
                throw new common_1.ConflictException("JÇ­ existe uma categoria com esse nome", {
                    cause: error,
                    description: "UNIQUE_CATEGORY_NAME",
                });
            }
            throw error;
        }
    }
    async update(userId, id, input) {
        const existing = await this.prisma.category.findFirst({ where: { id, userId } });
        if (!existing)
            throw new common_1.NotFoundException("Categoria nÇœo encontrada");
        try {
            const updated = await this.prisma.category.update({
                where: { id },
                data: {
                    ...(input.name !== undefined ? { name: input.name.trim() } : null),
                    ...(input.type !== undefined ? { type: input.type } : null),
                    ...(input.icon !== undefined ? { icon: input.icon } : null),
                    ...(input.color !== undefined ? { color: input.color } : null),
                },
            });
            return {
                id: updated.id,
                name: updated.name,
                type: updated.type,
                icon: updated.icon ?? undefined,
                color: updated.color ?? undefined,
                createdAt: toIso(updated.createdAt),
                updatedAt: toIso(updated.updatedAt),
            };
        }
        catch (error) {
            const prismaCode = error?.code;
            if (prismaCode === "P2002") {
                throw new common_1.ConflictException("JÇ­ existe uma categoria com esse nome", {
                    cause: error,
                    description: "UNIQUE_CATEGORY_NAME",
                });
            }
            throw error;
        }
    }
    async remove(userId, id) {
        const existing = await this.prisma.category.findFirst({ where: { id, userId } });
        if (!existing)
            throw new common_1.NotFoundException("Categoria nÇœo encontrada");
        await this.prisma.category.delete({ where: { id } });
        return { ok: true };
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);
