import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { RedisConfig } from '@config/configuration';

@Injectable()
export class RedisClientService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService) {
    const redis = config.getOrThrow<RedisConfig>('redis');
    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password || undefined,
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  standingsKey(contestId: string): string {
    return `contest:${contestId}:standings`;
  }

  teamStandingsKey(contestId: string): string {
    return `contest:${contestId}:team-standings`;
  }
}
