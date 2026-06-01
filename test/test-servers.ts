import { MongoMemoryServer } from 'mongodb-memory-server';
import { RedisMemoryServer } from 'redis-memory-server';

let mongoServer: MongoMemoryServer | undefined;
let redisServer: RedisMemoryServer | undefined;

export async function startTestServers(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_SECRET ??= 'nibras-test-auth-secret-min-32-chars';
  process.env.WEB_BASE_URL ??= 'http://localhost:3000';
  process.env.API_BASE_URL ??= 'http://localhost:3000';

  if (!process.env.MONGO_URI) {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
  }

  if (!process.env.REDIS_HOST) {
    redisServer = new RedisMemoryServer();
    process.env.REDIS_HOST = await redisServer.getHost();
    process.env.REDIS_PORT = String(await redisServer.getPort());
  }
}

export async function stopTestServers(): Promise<void> {
  await redisServer?.stop();
  redisServer = undefined;

  await mongoServer?.stop();
  mongoServer = undefined;
}
