import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthConfig } from '@config/configuration';
import { EmailService } from './email.service';
import { GithubOAuthService } from './github-oauth.service';

export type AuthProvidersConfig = {
  github: boolean;
  magicLink: boolean;
};

@Injectable()
export class AuthProvidersService {
  constructor(
    private readonly config: ConfigService,
    private readonly githubOAuth: GithubOAuthService,
    private readonly emailService: EmailService,
  ) {}

  getProviders(): AuthProvidersConfig {
    return {
      github: this.githubOAuth.isConfigured(),
      magicLink: this.emailService.isConfigured(),
    };
  }

  getAuthConfig(): AuthConfig {
    return this.config.getOrThrow<AuthConfig>('auth');
  }
}
