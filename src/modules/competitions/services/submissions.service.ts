import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CompPlatform, SubmissionStatus } from '../enums/competition.enums';
import { Contest } from '../schemas/contest.schema';
import { Submission } from '../schemas/submission.schema';
import { ContestTeam } from '../schemas/contest-team.schema';
import { JudgeService } from './judge.service';
import { StandingsService } from './standings.service';
import { ContestsGateway } from '../gateways/contests.gateway';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<Submission>,
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    @InjectModel(ContestTeam.name)
    private readonly teamModel: Model<ContestTeam>,
    private readonly judgeService: JudgeService,
    private readonly standingsService: StandingsService,
    private readonly contestsGateway: ContestsGateway,
  ) {}

  async submitSolution(
    userId: string,
    contestId: string,
    dto: { problemId: string; language: string; code: string },
  ) {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest) throw new NotFoundException('Contest not found');
    if (contest.platform !== CompPlatform.Internal) {
      throw new BadRequestException('Submissions only for internal contests');
    }

    const now = new Date();
    if (now < contest.startsAt || now > contest.endsAt) {
      throw new ForbiddenException('Contest is not active');
    }

    const uid = new Types.ObjectId(userId);
    if (!contest.participants.some((p) => p.equals(uid))) {
      throw new ForbiddenException('Not registered for this contest');
    }

    let teamId: Types.ObjectId | undefined;
    if (contest.isTeamBased) {
      const team = await this.teamModel
        .findOne({ contestId: contest._id, members: uid })
        .exec();
      teamId = team?._id;
    }

    const submission = await this.submissionModel.create({
      userId: uid,
      problemId: new Types.ObjectId(dto.problemId),
      contestId: contest._id,
      teamId,
      language: dto.language,
      code: dto.code,
      status: SubmissionStatus.Pending,
      submittedAt: new Date(),
    });

    const status = await this.judgeService.judgeSubmission(
      submission._id.toString(),
    );

    if (status === SubmissionStatus.Accepted) {
      const standings =
        await this.standingsService.recomputeStandings(contestId);
      this.contestsGateway.emitStandings(contestId, standings);
    }

    return {
      id: submission._id.toString(),
      status,
      runtime: submission.runtime,
      memory: submission.memory,
      score: submission.score,
    };
  }
}
