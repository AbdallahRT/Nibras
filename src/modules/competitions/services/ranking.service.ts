import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '@modules/auth/schemas/user.schema';
import {
  AccountVerificationStatus,
  CompPlatform,
} from '../enums/competition.enums';
import { CachedRanking } from '../schemas/cached-ranking.schema';
import { LinkedAccount } from '../schemas/linked-account.schema';
import { UserContestParticipation } from '../schemas/user-contest-participation.schema';
import { RANKING_PLATFORMS } from '../enums/competition.enums';

@Injectable()
export class RankingService {
  constructor(
    @InjectModel(CachedRanking.name)
    private readonly rankingModel: Model<CachedRanking>,
    @InjectModel(LinkedAccount.name)
    private readonly linkedAccountModel: Model<LinkedAccount>,
    @InjectModel(UserContestParticipation.name)
    private readonly participationModel: Model<UserContestParticipation>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getRanking(query: {
    host?: string;
    scope?: string;
    page?: string;
    limit?: string;
  }) {
    const scope = query.scope ?? 'global';
    const platform = query.host ?? 'all';
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '50', 10)));

    const rankings = await this.rankingModel
      .find({ scope, platform })
      .sort({ rank: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const userIds = rankings.map((r) => r.userId);
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('username')
      .exec();
    const userMap = new Map(users.map((u) => [u._id.toString(), u.username]));

    return rankings.map((r) => ({
      rank: r.rank,
      userId: r.userId.toString(),
      username: userMap.get(r.userId.toString()) ?? 'unknown',
      rating: r.rating,
      delta: r.delta,
      contestsLast30d: r.contestsLast30d,
    }));
  }

  async getMyRanking(userId: string) {
    const rankings = await this.rankingModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();

    return rankings.map((r) => ({
      scope: r.scope,
      platform: r.platform,
      rank: r.rank,
      rating: r.rating,
      delta: r.delta,
      contestsLast30d: r.contestsLast30d,
    }));
  }

  async rebuildRankings(): Promise<void> {
    const allLinked = await this.linkedAccountModel
      .find({ verificationStatus: AccountVerificationStatus.Verified })
      .distinct('userId')
      .exec();

    if (allLinked.length > 0) {
      await this.calcRankingForScope('global', allLinked);
    }
  }

  private async calcRankingForScope(
    scope: string,
    userIds: Types.ObjectId[],
  ): Promise<void> {
    for (const platform of RANKING_PLATFORMS) {
      const accountFilter =
        platform === 'all' ? {} : { platform: platform as CompPlatform };

      const userRatings: Array<{
        userId: Types.ObjectId;
        rating: number;
        delta: number;
        contestsLast30d: number;
      }> = [];

      for (const userId of userIds) {
        const accounts = await this.linkedAccountModel
          .find({
            userId,
            verificationStatus: AccountVerificationStatus.Verified,
            ...accountFilter,
          })
          .exec();

        if (accounts.length === 0) continue;

        const maxRating = Math.max(
          ...accounts.map((a) => a.platformRating ?? 0),
        );

        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        const contestCount = await this.participationModel.countDocuments({
          userId,
          createdAt: { $gte: thirtyDaysAgo },
          ...(platform !== 'all' ? { platform: platform as CompPlatform } : {}),
        });

        const latest = await this.participationModel
          .findOne({
            userId,
            ...(platform !== 'all'
              ? { platform: platform as CompPlatform }
              : {}),
          })
          .sort({ createdAt: -1 })
          .exec();

        userRatings.push({
          userId,
          rating: maxRating,
          delta: latest?.delta ?? 0,
          contestsLast30d: contestCount,
        });
      }

      userRatings.sort((a, b) => b.rating - a.rating);

      for (let i = 0; i < userRatings.length; i++) {
        const entry = userRatings[i];
        await this.rankingModel.findOneAndUpdate(
          { userId: entry.userId, scope, platform },
          {
            $set: {
              rank: i + 1,
              rating: entry.rating,
              delta: entry.delta,
              contestsLast30d: entry.contestsLast30d,
              calculatedAt: new Date(),
            },
          },
          { upsert: true },
        );
      }
    }
  }
}
