import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"
import * as bcrypt from "bcryptjs"
import { createHash, randomBytes } from "node:crypto"

import { PrismaService } from "../prisma/prisma.service"
import type { AuthResult, AuthTokens, AuthUser } from "./auth.types"

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex")
}

function sanitizeUser(user: { id: string; email: string; name: string | null }): AuthUser {
  return { id: user.id, email: user.email, name: user.name }
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private async issueTokens(user: { id: string; email: string; name: string | null }): Promise<AuthTokens> {
    const accessSecret = this.config.get<string>("JWT_ACCESS_SECRET")
    if (!accessSecret) throw new Error("Missing JWT_ACCESS_SECRET")
    const expiresIn = this.config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m"

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: accessSecret, expiresIn },
    )

    const ttlDays = Number(this.config.get("REFRESH_TOKEN_TTL_DAYS") ?? 30)
    const refreshToken = randomBytes(48).toString("base64url")
    const tokenHash = sha256(refreshToken)
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    })

    return { accessToken, refreshToken }
  }

  async register(input: { email: string; password: string; name?: string }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException({
        code: "AUTH_EMAIL_ALREADY_EXISTS",
        message: "E-mail já cadastrado",
      })
    }

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await this.prisma.user.create({
      data: { email, name: input.name?.trim() || null, passwordHash },
      select: { id: true, email: true, name: true },
    })

    const tokens = await this.issueTokens(user)
    return { user: sanitizeUser(user), ...tokens }
  }

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true },
    })

    if (!user) {
      throw new UnauthorizedException({
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Credenciais inválidas",
      })
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) {
      throw new UnauthorizedException({
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Credenciais inválidas",
      })
    }

    const tokens = await this.issueTokens({ id: user.id, email: user.email, name: user.name })
    return { user: sanitizeUser(user), ...tokens }
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
    if (!user) {
      throw new UnauthorizedException({
        code: "AUTH_USER_NOT_FOUND",
        message: "Usuário não encontrado",
      })
    }
    return sanitizeUser(user)
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = sha256(refreshToken)
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, name: true } } },
    })

    if (!token) {
      throw new UnauthorizedException({
        code: "AUTH_REFRESH_TOKEN_INVALID",
        message: "Refresh token inválido",
      })
    }
    if (token.revokedAt) {
      throw new UnauthorizedException({
        code: "AUTH_REFRESH_TOKEN_REVOKED",
        message: "Refresh token revogado",
      })
    }
    if (token.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        code: "AUTH_REFRESH_TOKEN_EXPIRED",
        message: "Refresh token expirado",
      })
    }

    const replacement = randomBytes(48).toString("base64url")
    const replacementHash = sha256(replacement)

    const ttlDays = Number(this.config.get("REFRESH_TOKEN_TTL_DAYS") ?? 30)
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)

    const newToken = await this.prisma.refreshToken.create({
      data: {
        userId: token.userId,
        tokenHash: replacementHash,
        expiresAt,
      },
      select: { id: true },
    })

    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date(), replacedByTokenId: newToken.id },
    })

    const accessSecret = this.config.get<string>("JWT_ACCESS_SECRET")
    if (!accessSecret) throw new Error("Missing JWT_ACCESS_SECRET")
    const expiresIn = this.config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m"

    const accessToken = await this.jwt.signAsync(
      { sub: token.user.id, email: token.user.email },
      { secret: accessSecret, expiresIn },
    )

    return { accessToken, refreshToken: replacement }
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
