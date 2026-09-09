import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthRole } from "@kutana/shared/auth/model/auth-session.js";
import { AuthService, type TokenPayload } from "./auth.service.js";
import { IS_PUBLIC_ROUTE } from "./public.decorator.js";
import { REQUIRED_ROLES } from "./roles.decorator.js";

interface AuthenticatedRequest {
  readonly headers: { readonly authorization?: string };
  readonly query?: { readonly access_token?: string };
  auth?: TokenPayload;
}

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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization =
      request.headers.authorization ?? bearerFromQuery(request.query?.access_token);
    const payload = this.authService.validateBearerToken(authorization);
    request.auth = payload;

    const requiredRoles = this.reflector.getAllAndOverride<readonly AuthRole[]>(REQUIRED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(payload.role)) {
      throw new ForbiddenException("Insufficient role");
    }

    return true;
  }
}

function bearerFromQuery(accessToken: string | undefined): string | undefined {
  return accessToken ? `Bearer ${accessToken}` : undefined;
}
