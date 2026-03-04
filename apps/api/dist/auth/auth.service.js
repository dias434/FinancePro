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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcryptjs");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../prisma/prisma.service");
function sha256(input) {
    return (0, node_crypto_1.createHash)("sha256").update(input).digest("hex");
}
function sanitizeUser(user) {
    return { id: user.id, email: user.email, name: user.name };
}
let AuthService = class AuthService {
    prisma;
    jwt;
    config;
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async issueTokens(user) {
        const accessSecret = this.config.get("JWT_ACCESS_SECRET");
        if (!accessSecret)
            throw new Error("Missing JWT_ACCESS_SECRET");
        const expiresIn = this.config.get("JWT_ACCESS_EXPIRES_IN") ?? "15m";
        const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email }, { secret: accessSecret, expiresIn });
        const ttlDays = Number(this.config.get("REFRESH_TOKEN_TTL_DAYS") ?? 30);
        const refreshToken = (0, node_crypto_1.randomBytes)(48).toString("base64url");
        const tokenHash = sha256(refreshToken);
        const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
            },
        });
        return { accessToken, refreshToken };
    }
    async register(input) {
        const email = input.email.trim().toLowerCase();
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new common_1.ConflictException({
                code: "AUTH_EMAIL_ALREADY_EXISTS",
                message: "E-mail já cadastrado",
            });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = await this.prisma.user.create({
            data: { email, name: input.name?.trim() || null, passwordHash },
            select: { id: true, email: true, name: true },
        });
        const tokens = await this.issueTokens(user);
        return { user: sanitizeUser(user), ...tokens };
    }
    async login(input) {
        const email = input.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, passwordHash: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException({
                code: "AUTH_INVALID_CREDENTIALS",
                message: "Credenciais inválidas",
            });
        }
        const ok = await bcrypt.compare(input.password, user.passwordHash);
        if (!ok) {
            throw new common_1.UnauthorizedException({
                code: "AUTH_INVALID_CREDENTIALS",
                message: "Credenciais inválidas",
            });
        }
        const tokens = await this.issueTokens({ id: user.id, email: user.email, name: user.name });
        return { user: sanitizeUser(user), ...tokens };
    }
    async me(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException({
                code: "AUTH_USER_NOT_FOUND",
                message: "Usuário não encontrado",
            });
        }
        return sanitizeUser(user);
    }
    async refresh(refreshToken) {
        const tokenHash = sha256(refreshToken);
        const token = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: { select: { id: true, email: true, name: true } } },
        });
        if (!token) {
            throw new common_1.UnauthorizedException({
                code: "AUTH_REFRESH_TOKEN_INVALID",
                message: "Refresh token inválido",
            });
        }
        if (token.revokedAt) {
            throw new common_1.UnauthorizedException({
                code: "AUTH_REFRESH_TOKEN_REVOKED",
                message: "Refresh token revogado",
            });
        }
        if (token.expiresAt.getTime() <= Date.now()) {
            throw new common_1.UnauthorizedException({
                code: "AUTH_REFRESH_TOKEN_EXPIRED",
                message: "Refresh token expirado",
            });
        }
        const replacement = (0, node_crypto_1.randomBytes)(48).toString("base64url");
        const replacementHash = sha256(replacement);
        const ttlDays = Number(this.config.get("REFRESH_TOKEN_TTL_DAYS") ?? 30);
        const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
        const newToken = await this.prisma.refreshToken.create({
            data: {
                userId: token.userId,
                tokenHash: replacementHash,
                expiresAt,
            },
            select: { id: true },
        });
        await this.prisma.refreshToken.update({
            where: { id: token.id },
            data: { revokedAt: new Date(), replacedByTokenId: newToken.id },
        });
        const accessSecret = this.config.get("JWT_ACCESS_SECRET");
        if (!accessSecret)
            throw new Error("Missing JWT_ACCESS_SECRET");
        const expiresIn = this.config.get("JWT_ACCESS_EXPIRES_IN") ?? "15m";
        const accessToken = await this.jwt.signAsync({ sub: token.user.id, email: token.user.email }, { secret: accessSecret, expiresIn });
        return { accessToken, refreshToken: replacement };
    }
    async logout(refreshToken) {
        const tokenHash = sha256(refreshToken);
        await this.prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(jwt_1.JwtService)),
    __param(2, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
