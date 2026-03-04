import { Body, Controller, Get, Post, Req } from "@nestjs/common"
import { Inject } from "@nestjs/common"

import { AuthService } from "./auth.service"
import { LoginDto } from "./dto/login.dto"
import { RegisterDto } from "./dto/register.dto"
import { RefreshDto } from "./dto/refresh.dto"
import { LogoutDto } from "./dto/logout.dto"
import { AccessGuard } from "./guards/access.guard"
import { UseGuards } from "@nestjs/common"

@Controller("auth")
export class AuthController {
  private readonly auth: AuthService

  constructor(@Inject(AuthService) auth: AuthService) {
    this.auth = auth
  }

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken)
  }

  @Post("logout")
  async logout(@Body() dto: LogoutDto) {
    await this.auth.logout(dto.refreshToken)
    return { ok: true }
  }

  @Get("me")
  @UseGuards(AccessGuard)
  me(@Req() req: any) {
    return this.auth.me(req.user.sub)
  }
}
