import { CanActivate, ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
export declare class AccessGuard implements CanActivate {
    private readonly jwt;
    private readonly config;
    constructor(jwt: JwtService, config: ConfigService);
    canActivate(context: ExecutionContext): boolean;
}
