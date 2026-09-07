import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service.js";
import { IS_PUBLIC_ROUTE } from "./public.decorator.js";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      readonly headers: { readonly authorization?: string };
      readonly query?: { readonly access_token?: string };
    }>();
    const authorization =
      request.headers.authorization ?? bearerFromQuery(request.query?.access_token);
    this.authService.validateBearerToken(authorization);
    return true;
  }
}

function bearerFromQuery(accessToken: string | undefined): string | undefined {
  return accessToken ? `Bearer ${accessToken}` : undefined;
}
