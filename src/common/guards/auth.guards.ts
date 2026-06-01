import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
  WEB_SESSION_COOKIE,
} from '@common/decorators/auth.decorators';
import { roleMeetsAnyRequirement } from '@common/constants/role-hierarchy';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { SessionService } from '@modules/auth/services/session.service';

function getBearerToken(request: Request): string | null {
  const raw = request.headers.authorization;
  if (raw?.startsWith('Bearer ')) {
    return raw.slice('Bearer '.length).trim();
  }
  const stParam = (request.query as Record<string, string | undefined>)?.st;
  if (stParam) return stParam;
  return null;
}

function getCookieValue(request: Request, name: string): string | null {
  const raw = request.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [cookieName, ...rest] = part.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const bearerToken = getBearerToken(request);
    const cookieToken = getCookieValue(request, WEB_SESSION_COOKIE);
    const token = bearerToken || cookieToken;

    try {
      request.user = await this.sessionService.validateSessionToken(token);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Session is invalid or expired',
      });
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
    }

    if (!roleMeetsAnyRequirement(user.role, requiredRoles)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient role permissions',
      });
    }

    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
    }

    const hasAll = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );
    if (!hasAll) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }

    return true;
  }
}
