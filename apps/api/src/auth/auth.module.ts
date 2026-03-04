import { Global, Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"

import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { AccessGuard } from "./guards/access.guard"

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AccessGuard],
  exports: [JwtModule, AccessGuard],
})
export class AuthModule {}
