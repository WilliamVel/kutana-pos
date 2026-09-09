import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PostgresModule } from "../infrastructure/postgres/postgres.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { PostgresRefreshTokenStore, REFRESH_TOKEN_STORE } from "./refresh-token-store.js";
import { AUTH_USER_STORE, PostgresAuthUserStore } from "./user-store.js";

@Module({
  imports: [PostgresModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: REFRESH_TOKEN_STORE, useClass: PostgresRefreshTokenStore },
    { provide: AUTH_USER_STORE, useClass: PostgresAuthUserStore },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
