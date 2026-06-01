import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisClientService } from '@database/redis-client.service';
import { ScoringMode, SubmissionStatus } from '../enums/competition.enums';
import { Contest } from '../schemas/contest.schema';
import { Submission } from '../schemas/submission.schema';
import { User } from '@modules/auth/schemas/user.schema';

export type StandingEntry = {
  rank: number;
  userId: string;
  username?: string;
  teamId?: string;
  solved: number;
  penalty: number;
  score: number;
};

@Injectable()
export class StandingsService {
  constructor(
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<Submission>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly redis: RedisClientService,
  ) {}

  icpcScore(solved: number, penaltyMinutes: number): number {
    return solved * 1_000_000 - penaltyMinutes;
  }

  ioiScore(totalPoints: number): number {
    return totalPoints;
  }

  async recomputeStandings(contestId: string): Promise<StandingEntry[]> {
    const contest = await this.contestModel.findById(contestId).exec();
    if (!contest) return [];

    const subs = await this.submissionModel
      .find({ contestId: new Types.ObjectId(contestId) })
      .sort({ submittedAt: 1 })
      .exec();

    const byUser = new Map<
      string,
      {
        solved: Set<string>;
        wrongAttempts: Map<string, number>;
        penalty: number;
        score: number;
      }
    >();

    for (const sub of subs) {
      const key = sub.teamId?.toString() ?? sub.userId.toString();
      if (!byUser.has(key)) {
        byUser.set(key, {
          solved: new Set(),
          wrongAttempts: new Map(),
          penalty: 0,
          score: 0,
        });
      }
      const entry = byUser.get(key)!;
      const pid = sub.problemId.toString();

      if (sub.status === SubmissionStatus.Accepted) {
        if (!entry.solved.has(pid)) {
          entry.solved.add(pid);
          const wrongs = entry.wrongAttempts.get(pid) ?? 0;
          const minutes =
            (sub.submittedAt.getTime() - contest.startsAt.getTime()) / 60000;
          if (contest.scoringMode === ScoringMode.Icpc) {
            entry.penalty += minutes + wrongs * 20;
          } else {
            entry.score += sub.score || 100;
          }
        }
      } else if (
        sub.status !== SubmissionStatus.Pending &&
        !entry.solved.has(pid)
      ) {
        entry.wrongAttempts.set(pid, (entry.wrongAttempts.get(pid) ?? 0) + 1);
      }
    }

    const rows: StandingEntry[] = [];
    for (const [key, data] of byUser) {
      const redisScore =
        contest.scoringMode === ScoringMode.Icpc
          ? this.icpcScore(data.solved.size, data.penalty)
          : this.ioiScore(data.score);

      const isTeam = Boolean(contest.isTeamBased && key.length === 24);
      await this.redis.client.zadd(
        isTeam
          ? this.redis.teamStandingsKey(contestId)
          : this.redis.standingsKey(contestId),
        redisScore,
        key,
      );

      rows.push({
        rank: 0,
        userId: isTeam ? '' : key,
        teamId: isTeam ? key : undefined,
        solved: data.solved.size,
        penalty: data.penalty,
        score: data.score,
      });
    }

    rows.sort((a, b) => {
      if (contest.scoringMode === ScoringMode.Icpc) {
        if (b.solved !== a.solved) return b.solved - a.solved;
        return a.penalty - b.penalty;
      }
      return b.score - a.score;
    });

    rows.forEach((r, i) => {
      r.rank = i + 1;
    });

    const ttlSec = Math.max(
      3600,
      Math.ceil((contest.endsAt.getTime() - Date.now()) / 1000) + 86400,
    );
    await this.redis.client.expire(this.redis.standingsKey(contestId), ttlSec);
    if (contest.isTeamBased) {
      await this.redis.client.expire(
        this.redis.teamStandingsKey(contestId),
        ttlSec,
      );
    }

    return rows;
  }

  async getStandings(contestId: string): Promise<StandingEntry[]> {
    const key = this.redis.standingsKey(contestId);
    const raw = await this.redis.client.zrevrange(key, 0, 99, 'WITHSCORES');
    if (raw.length === 0) {
      return this.recomputeStandings(contestId);
    }

    const contest = await this.contestModel.findById(contestId).exec();
    const entries: StandingEntry[] = [];

    for (let i = 0; i < raw.length; i += 2) {
      const memberId = raw[i];
      const score = parseFloat(raw[i + 1]);
      const user = await this.userModel.findById(memberId).select('username');
      entries.push({
        rank: Math.floor(i / 2) + 1,
        userId: memberId,
        username: user?.username,
        solved:
          contest?.scoringMode === ScoringMode.Icpc
            ? Math.floor(score / 1_000_000)
            : 0,
        penalty: 0,
        score: contest?.scoringMode === ScoringMode.Ioi ? score : 0,
      });
    }
    return entries;
  }
}
