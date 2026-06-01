import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Model, Types } from 'mongoose';
import type { AuthConfig } from '@config/configuration';
import { Role } from '@modules/rbac/schemas/role.schema';
import { Permission } from '@modules/rbac/schemas/permission.schema';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { User } from '../schemas/user.schema';
import { WebSession } from '../schemas/web-session.schema';
import { SessionRedisService } from './session-redis.service';

@Injectable()
export class SessionService {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(WebSession.name)
    private readonly webSessionModel: Model<WebSession>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<Permission>,
    private readonly sessionRedis: SessionRedisService,
  ) {
    this.authConfig = this.config.getOrThrow<AuthConfig>('auth');
  }

  getSessionTtlMs(): number {
    return this.authConfig.sessionTtlDays * 24 * 60 * 60 * 1000;
  }

  async createSession(userId: string): Promise<string> {
    const sessionToken = `web_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + this.getSessionTtlMs());

    await this.webSessionModel.create({
      sessionToken,
      userId: new Types.ObjectId(userId),
      expiresAt,
    });

    await this.sessionRedis.setSession(
      sessionToken,
      userId,
      this.getSessionTtlMs(),
    );

    await this.userModel.updateOne(
      { _id: userId },
      { $set: { lastActive: new Date() } },
    );

    return sessionToken;
  }

  async revokeSession(sessionToken: string): Promise<void> {
    await this.webSessionModel.updateMany(
      { sessionToken, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    await this.sessionRedis.deleteSession(sessionToken);
  }

  async validateSessionToken(
    sessionToken: string | null | undefined,
  ): Promise<AuthenticatedUser> {
    if (!sessionToken) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
    }

    const cachedUserId = await this.sessionRedis.getSessionUserId(sessionToken);
    if (cachedUserId) {
      const user = await this.loadAuthenticatedUser(cachedUserId);
      if (user) return user;
      await this.sessionRedis.deleteSession(sessionToken);
    }

    const session = await this.webSessionModel.findOne({ sessionToken }).exec();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Session is invalid or expired',
      });
    }

    const user = await this.loadAuthenticatedUser(session.userId.toString());
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Session is invalid or expired',
      });
    }

    const remainingMs = session.expiresAt.getTime() - Date.now();
    if (remainingMs > 0) {
      await this.sessionRedis.setSession(
        sessionToken,
        session.userId.toString(),
        remainingMs,
      );
    }

    return user;
  }

  private async loadAuthenticatedUser(
    userId: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.userModel.findById(userId).populate('role').exec();
    if (!user || !user.role) return null;

    const roleDoc = user.role as unknown as Role & { _id: Types.ObjectId };
    const permissions = await this.permissionModel
      .find({ _id: { $in: roleDoc.permissions ?? [] } })
      .exec();

    return {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      role: roleDoc.name,
      roleId: roleDoc._id.toString(),
      permissions: permissions.map((p) => `${p.resource}:${p.action}`),
      reputationScore: user.reputationScore,
      githubLinked: user.githubLinked,
      emailVerified: user.emailVerified,
      institution: user.institution,
      preferences: user.preferences ?? {},
    };
  }
}
