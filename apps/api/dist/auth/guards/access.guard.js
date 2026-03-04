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
exports.AccessGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let AccessGuard = class AccessGuard {
    jwt;
    config;
    constructor(jwt, config) {
        this.jwt = jwt;
        this.config = config;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const header = request.headers?.authorization;
        const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
        if (!token) {
            throw new common_1.UnauthorizedException({
                code: "AUTH_MISSING_ACCESS_TOKEN",
                message: "Missing access token",
            });
        }
        try {
            const payload = this.jwt.verify(token, {
                secret: this.config.get("JWT_ACCESS_SECRET"),
            });
            request.user = payload;
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException({
                code: "AUTH_INVALID_ACCESS_TOKEN",
                message: "Invalid access token",
            });
        }
    }
};
exports.AccessGuard = AccessGuard;
exports.AccessGuard = AccessGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(jwt_1.JwtService)),
    __param(1, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], AccessGuard);
