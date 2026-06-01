import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { fetchers } from '../fetchers';
import {
  AccountVerificationStatus,
  CompPlatform,
} from '../enums/competition.enums';
import { LinkedAccount } from '../schemas/linked-account.schema';

@Injectable()
export class LeetcodePracticeService {
  constructor(
    @InjectModel(LinkedAccount.name)
    private readonly linkedAccountModel: Model<LinkedAccount>,
  ) {}

  async resolveHandle(
    userId: string | undefined,
    queryHandle?: string,
  ): Promise<string | undefined> {
    if (queryHandle?.trim()) return queryHandle.trim();
    if (!userId) return undefined;

    const account = await this.linkedAccountModel
      .findOne({
        userId,
        platform: CompPlatform.Leetcode,
        verificationStatus: AccountVerificationStatus.Verified,
      })
      .exec();
    return account?.handle;
  }

  async fetchProblems(
    handle: string | undefined,
    query: {
      page?: number;
      limit?: number;
      q?: string;
      solved?: 'true' | 'false';
    },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 100));
    const all = await fetchers.leetcode.fetchProblems();

    let solvedSet = new Set<string>();
    if (handle) {
      try {
        const stats = await fetchers.leetcode.fetchUserStats(handle);
        solvedSet = new Set(stats.solvedProblemIds);
      } catch {
        solvedSet = new Set();
      }
    }

    let rows = all.map((p) => ({
      problemId: p.platformProblemId,
      title: p.title,
      url: p.url,
      difficulty: p.difficulty,
      tags: p.tags,
      solved: solvedSet.has(p.platformProblemId),
    }));

    if (query.q) {
      const q = query.q.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(q));
    }
    if (query.solved === 'true') rows = rows.filter((r) => r.solved);
    if (query.solved === 'false') rows = rows.filter((r) => !r.solved);

    const total = rows.length;
    const start = (page - 1) * limit;
    return {
      items: rows.slice(start, start + limit),
      total,
      solvedCount: rows.filter((r) => r.solved).length,
      handle: handle ?? null,
      page,
      limit,
    };
  }

  async fetchAnalytics(handle: string) {
    const stats = await fetchers.leetcode.fetchUserStats(handle);
    return {
      handle,
      rating: stats.rating,
      maxRating: stats.maxRating,
      contestsParticipated: stats.contestHistory.length,
      problemsSolved: stats.solvedProblemIds.length,
    };
  }
}
