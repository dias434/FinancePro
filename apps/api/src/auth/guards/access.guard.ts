import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"

type JwtPayload = { sub: string; email: string }

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>()
    const header = (request as any).headers?.authorization as string | undefined
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined
    if (!token) {
      throw new UnauthorizedException({
        code: "AUTH_MISSING_ACCESS_TOKEN",
        message: "Missing access token",
      })
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET")!,
      })
      ;(request as any).user = payload
      return true
    } catch {
      throw new UnauthorizedException({
        code: "AUTH_INVALID_ACCESS_TOKEN",
        message: "Invalid access token",
      })
    }
  }
}
