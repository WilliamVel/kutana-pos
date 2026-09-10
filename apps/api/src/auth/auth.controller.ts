import type { AuthRole, AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { AuthService, type PublicUserRecord } from "./auth.service.js";
import { Public } from "./public.decorator.js";
import { RequireRole } from "./roles.decorator.js";

interface LoginDto {
  readonly operator: string;
  readonly pin: string;
}

interface RefreshDto {
  readonly refreshToken?: string;
}

interface ChangePinDto {
  readonly currentPin: string;
  readonly newPin: string;
}

interface ResetPinDto {
  readonly newPin: string;
}

interface AuthenticatedRequest {
  readonly auth: { readonly sub: string };
}

interface CreateUserDto {
  readonly displayName: string;
  readonly role: AuthRole;
  readonly pin: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: LoginDto): Promise<AuthSession> {
    return this.authService.login(body);
  }

  @Post("change-pin")
  changeOwnPin(@Req() request: AuthenticatedRequest, @Body() body: ChangePinDto): Promise<void> {
    return this.authService.changeOwnPin(request.auth.sub, body);
  }

  @Public()
  @Post("refresh")
  refresh(@Body() body: RefreshDto): Promise<AuthSession> {
    return this.authService.refresh(body.refreshToken);
  }

  @RequireRole("admin")
  @Get("users")
  listUsers(): Promise<readonly PublicUserRecord[]> {
    return this.authService.listUsers();
  }

  @RequireRole("admin")
  @Post("users")
  createUser(@Body() body: CreateUserDto): Promise<PublicUserRecord> {
    return this.authService.createUser(body);
  }

  @RequireRole("admin")
  @Post("users/:id/reset-pin")
  resetPin(@Param("id") id: string, @Body() body: ResetPinDto): Promise<void> {
    return this.authService.resetPin(id, body.newPin);
  }

  @RequireRole("admin")
  @Delete("users/:id")
  async deactivateUser(@Param("id") id: string): Promise<PublicUserRecord> {
    const user = await this.authService.deactivateUser(id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
