import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { Public } from "./public.decorator.js";

interface LoginDto {
  readonly operator: string;
  readonly pin: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: LoginDto): AuthSession {
    return this.authService.login(body);
  }
}
