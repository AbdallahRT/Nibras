import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RbacModule } from '@modules/rbac/rbac.module';
import {
  Permission,
  PermissionSchema,
} from '@modules/rbac/schemas/permission.schema';
import { Role, RoleSchema } from '@modules/rbac/schemas/role.schema';
import { AuthController } from './auth.controller';
import { User, UserSchema } from './schemas/user.schema';
import { WebSession, WebSessionSchema } from './schemas/web-session.schema';
import {
  GithubAccount,
  GithubAccountSchema,
} from './schemas/github-account.schema';
import {
  MagicLinkVerification,
  MagicLinkVerificationSchema,
} from './schemas/magic-link-verification.schema';
import { AuthProvidersService } from './services/auth-providers.service';
import { EmailService } from './services/email.service';
import { GithubOAuthService } from './services/github-oauth.service';
import { MagicLinkService } from './services/magic-link.service';
import { SessionRedisService } from './services/session-redis.service';
import { SessionService } from './services/session.service';
import {
  PermissionsGuard,
  RolesGuard,
  SessionAuthGuard,
} from '@common/guards/auth.guards';

@Module({
  imports: [
    RbacModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: WebSession.name, schema: WebSessionSchema },
      { name: GithubAccount.name, schema: GithubAccountSchema },
      { name: MagicLinkVerification.name, schema: MagicLinkVerificationSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthProvidersService,
    EmailService,
    GithubOAuthService,
    MagicLinkService,
    SessionRedisService,
    SessionService,
    SessionAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    MongooseModule,
    SessionService,
    SessionAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
