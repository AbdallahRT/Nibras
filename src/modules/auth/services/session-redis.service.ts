import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

const SESSION_PREFIX = 'session:';

@Injectable()
export class SessionRedisService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private key(token: string): string {
    return `${SESSION_PREFIX}${token}`;
  }

  async setSession(
    token: string,
    userId: string,
    ttlMs: number,
  ): Promise<void> {
    await this.cache.set(this.key(token), userId, ttlMs);
  }

  async getSessionUserId(token: string): Promise<string | undefined> {
    const value = await this.cache.get<string>(this.key(token));
    return value ?? undefined;
  }

  async deleteSession(token: string): Promise<void> {
    await this.cache.del(this.key(token));
  }
}
