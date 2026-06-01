import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { SessionService } from './session.service';
import { SessionRedisService } from './session-redis.service';
import { WebSession } from '../schemas/web-session.schema';
import { User } from '../schemas/user.schema';
import { Role } from '@modules/rbac/schemas/role.schema';
import { Permission } from '@modules/rbac/schemas/permission.schema';

describe('SessionService', () => {
  let service: SessionService;

  const webSessionModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn(),
  };
  const userModel = {
    findById: jest.fn(),
    updateOne: jest.fn(),
  };
  const roleModel = {};
  const permissionModel = {
    find: jest.fn(),
  };
  const sessionRedis = {
    setSession: jest.fn(),
    getSessionUserId: jest.fn(),
    deleteSession: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => ({
              sessionTtlDays: 30,
            }),
          },
        },
        { provide: getModelToken(WebSession.name), useValue: webSessionModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Role.name), useValue: roleModel },
        { provide: getModelToken(Permission.name), useValue: permissionModel },
        { provide: SessionRedisService, useValue: sessionRedis },
      ],
    }).compile();

    service = module.get(SessionService);
  });

  it('creates a web session token', async () => {
    webSessionModel.create.mockResolvedValue({});
    sessionRedis.setSession.mockResolvedValue(undefined);
    userModel.updateOne.mockResolvedValue({});

    const token = await service.createSession(new Types.ObjectId().toString());

    expect(token).toMatch(/^web_/);
    expect(webSessionModel.create).toHaveBeenCalled();
    expect(sessionRedis.setSession).toHaveBeenCalledWith(
      token,
      expect.any(String),
      expect.any(Number),
    );
  });
});
