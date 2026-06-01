import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CompPlatform } from '../enums/competition.enums';
import { Contest } from '../schemas/contest.schema';
import { ContestTeam } from '../schemas/contest-team.schema';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    @InjectModel(ContestTeam.name)
    private readonly teamModel: Model<ContestTeam>,
  ) {}

  async createTeam(
    userId: string,
    contestId: string,
    dto: { name: string; memberIds: string[] },
  ) {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest) throw new NotFoundException('Contest not found');
    if (!contest.isTeamBased) {
      throw new BadRequestException('Contest is not team-based');
    }
    if (contest.platform !== CompPlatform.Internal) {
      throw new BadRequestException('Teams only for internal contests');
    }

    const members = [
      new Types.ObjectId(userId),
      ...dto.memberIds.map((id) => new Types.ObjectId(id)),
    ];
    const unique = [...new Set(members.map((m) => m.toString()))];
    if (unique.length < 2 || unique.length > 3) {
      throw new BadRequestException('Teams must have 2-3 unique members');
    }

    for (const mid of unique) {
      if (!contest.participants.some((p) => p.toString() === mid)) {
        throw new BadRequestException('All members must be registered');
      }
    }

    const team = await this.teamModel.create({
      contestId: contest._id,
      name: dto.name,
      members: unique.map((id) => new Types.ObjectId(id)),
      captainId: new Types.ObjectId(userId),
    });

    return {
      id: team._id.toString(),
      name: team.name,
      members: team.members.map((m) => m.toString()),
    };
  }
}
