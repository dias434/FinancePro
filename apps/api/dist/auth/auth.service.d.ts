import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthResult, AuthTokens, AuthUser } from "./auth.types";
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    private issueTokens;
    register(input: {
        email: string;
        password: string;
        name?: string;
    }): Promise<AuthResult>;
    login(input: {
        email: string;
        password: string;
    }): Promise<AuthResult>;
    me(userId: string): Promise<AuthUser>;
    refresh(refreshToken: string): Promise<AuthTokens>;
    logout(refreshToken: string): Promise<void>;
}
