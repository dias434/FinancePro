import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { LogoutDto } from "./dto/logout.dto";
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto): Promise<import("./auth.types").AuthResult>;
    login(dto: LoginDto): Promise<import("./auth.types").AuthResult>;
    refresh(dto: RefreshDto): Promise<import("./auth.types").AuthTokens>;
    logout(dto: LogoutDto): Promise<{
        ok: boolean;
    }>;
    me(req: any): Promise<import("./auth.types").AuthUser>;
}
