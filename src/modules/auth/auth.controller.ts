import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AppConfig, AuthConfig } from '@config/configuration';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import { UseGuards } from '@nestjs/common';
import { AuthProvidersService } from './services/auth-providers.service';
import { GithubOAuthService } from './services/github-oauth.service';
import { MagicLinkService } from './services/magic-link.service';
import { SessionService } from './services/session.service';
import { AuthProvidersResponseDto, MagicLinkRequestDto } from './dto/auth.dto';
import {
  buildAuthCompleteRedirect,
  buildWebSessionCookie,
  sanitizeNextPath,
} from './utils/redirect.helpers';
import { WEB_SESSION_COOKIE } from '@common/decorators/auth.decorators';

function getSessionTokenFromRequest(request: Request): string | null {
  const raw = request.headers.authorization;
  if (raw?.startsWith('Bearer ')) {
    return raw.slice('Bearer '.length).trim();
  }
  const cookie = request.headers.cookie;
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === WEB_SESSION_COOKIE) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authProviders: AuthProvidersService,
    private readonly githubOAuth: GithubOAuthService,
    private readonly magicLink: MagicLinkService,
    private readonly sessionService: SessionService,
    private readonly config: ConfigService,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'Get available auth providers' })
  getProviders(): AuthProvidersResponseDto {
    return this.authProviders.getProviders();
  }

  @Get('github')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Start GitHub OAuth sign-in' })
  startGithub(
    @Query('next') next: string | undefined,
    @Res() res: Response,
  ): void {
    if (!this.githubOAuth.isConfigured()) {
      throw new ServiceUnavailableException(
        'GitHub sign-in is not configured on this server.',
      );
    }
    const url = this.githubOAuth.buildAuthorizeUrl(next);
    res.redirect(url);
  }

  @Get('github/callback')
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const authConfig = this.config.getOrThrow<AuthConfig>('auth');
    const appConfig = this.config.getOrThrow<AppConfig>('app');

    if (!code || !state) {
      res.redirect(`${authConfig.webBaseUrl}/?error=oauth_failed`);
      return;
    }

    const stateData = this.githubOAuth.verifyState(state);
    if (!stateData) {
      res.redirect(`${authConfig.webBaseUrl}/?error=oauth_state_invalid`);
      return;
    }

    try {
      const userId = await this.githubOAuth.handleCallback(code);
      const sessionToken = await this.sessionService.createSession(userId);
      const redirectUrl = buildAuthCompleteRedirect(
        authConfig.webBaseUrl,
        sessionToken,
        stateData.next,
      );

      res.setHeader(
        'Set-Cookie',
        buildWebSessionCookie(sessionToken, {
          secure: appConfig.nodeEnv === 'production',
          maxAgeSeconds: authConfig.sessionTtlDays * 24 * 60 * 60,
        }),
      );
      res.redirect(redirectUrl);
    } catch {
      res.redirect(`${authConfig.webBaseUrl}/?error=oauth_failed`);
    }
  }

  @Post('magic-link')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a magic sign-in link via email' })
  async requestMagicLink(@Body() body: MagicLinkRequestDto): Promise<void> {
    if (!this.magicLink.isConfigured()) {
      throw new ServiceUnavailableException(
        'Email sign-in is not configured on this server. Ask an admin to set RESEND_API_KEY, or use GitHub sign-in.',
      );
    }
    await this.magicLink.requestMagicLink(body.email, body.next);
  }

  @Get('magic-link/verify')
  @ApiOperation({ summary: 'Verify magic link token and create session' })
  async verifyMagicLink(
    @Query('token') token: string | undefined,
    @Query('next') next: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const authConfig = this.config.getOrThrow<AuthConfig>('auth');
    const appConfig = this.config.getOrThrow<AppConfig>('app');

    if (!token) {
      res.redirect(`${authConfig.webBaseUrl}/?error=magic_link_invalid`);
      return;
    }

    try {
      const userId = await this.magicLink.verifyMagicLink(token);
      const sessionToken = await this.sessionService.createSession(userId);
      const redirectUrl = buildAuthCompleteRedirect(
        authConfig.webBaseUrl,
        sessionToken,
        sanitizeNextPath(next),
      );

      res.setHeader(
        'Set-Cookie',
        buildWebSessionCookie(sessionToken, {
          secure: appConfig.nodeEnv === 'production',
          maxAgeSeconds: authConfig.sessionTtlDays * 24 * 60 * 60,
        }),
      );
      res.redirect(redirectUrl);
    } catch {
      res.redirect(`${authConfig.webBaseUrl}/?error=magic_link_invalid`);
    }
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  @ApiOperation({ summary: 'Revoke current web session' })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = getSessionTokenFromRequest(req);
    if (token) {
      await this.sessionService.revokeSession(token);
    }

    res.setHeader(
      'Set-Cookie',
      `${WEB_SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`,
    );
    res.status(204).send();
  }
}
