import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { fetchers } from '../fetchers';
import {
  AccountVerificationStatus,
  CompPlatform,
} from '../enums/competition.enums';
import { LinkedAccount } from '../schemas/linked-account.schema';

type CfProblem = {
  contestId?: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
};

@Injectable()
export class CodeforcesPracticeService {
  private problemsetCache: { problems: CfProblem[]; at: number } | null = null;

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
        platform: CompPlatform.Codeforces,
        verificationStatus: AccountVerificationStatus.Verified,
      })
      .exec();
    return account?.handle;
  }

  private async getProblemset(): Promise<CfProblem[]> {
    const TTL = 3600_000;
    if (this.problemsetCache && Date.now() - this.problemsetCache.at < TTL) {
      return this.problemsetCache.problems;
    }
    const raw = await fetchers.codeforces.fetchProblems();
    const problems: CfProblem[] = raw.map((p) => {
      const match = p.platformProblemId.match(/^(\d+)?([A-Z]\d*)$/);
      return {
        contestId: match?.[1] ? parseInt(match[1], 10) : undefined,
        index: match?.[2] ?? p.platformProblemId,
        name: p.title,
        rating: p.difficulty,
        tags: p.tags,
      };
    });
    this.problemsetCache = { problems, at: Date.now() };
    return problems;
  }

  async fetchProblems(
    handle: string | undefined,
    query: {
      page?: number;
      limit?: number;
      q?: string;
      tag?: string;
      ratingMin?: number;
      ratingMax?: number;
      solved?: 'true' | 'false';
    },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 100));
    const problems = await this.getProblemset();

    let statusMap = new Map<string, { solved: boolean; attempted: boolean }>();
    if (handle) {
      try {
        const stats = await fetchers.codeforces.fetchUserStats(handle);
        for (const pid of stats.solvedProblemIds) {
          statusMap.set(pid, { solved: true, attempted: true });
        }
      } catch {
        statusMap = new Map();
      }
    }

    const rows = problems
      .filter((p) => {
        if (query.q && !p.name.toLowerCase().includes(query.q.toLowerCase()))
          return false;
        if (
          query.tag &&
          !p.tags.some((t) => t.toLowerCase() === query.tag!.toLowerCase())
        )
          return false;
        if (query.ratingMin !== undefined && (p.rating ?? 0) < query.ratingMin)
          return false;
        if (query.ratingMax !== undefined && (p.rating ?? 0) > query.ratingMax)
          return false;
        const key = p.contestId ? `${p.contestId}${p.index}` : p.index;
        const st = statusMap.get(key);
        if (query.solved === 'true' && !st?.solved) return false;
        if (query.solved === 'false' && st?.solved) return false;
        return true;
      })
      .map((p) => {
        const key = p.contestId ? `${p.contestId}${p.index}` : p.index;
        const st = statusMap.get(key);
        return {
          problemId: key,
          index: p.index,
          name: p.name,
          url: p.contestId
            ? `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`
            : `https://codeforces.com/problemset/problem/0/${p.index}`,
          solved: st?.solved ?? false,
          attempted: st?.attempted ?? false,
          rating: p.rating ?? 0,
          tags: p.tags,
          contestId: p.contestId ? String(p.contestId) : undefined,
        };
      });

    const total = rows.length;
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit);
    const solvedCount = rows.filter((r) => r.solved).length;

    return { items, total, solvedCount, handle: handle ?? null, page, limit };
  }

  async fetchAnalytics(handle: string) {
    const stats = await fetchers.codeforces.fetchUserStats(handle);
    return {
      handle,
      rating: stats.rating,
      maxRating: stats.maxRating,
      contestsParticipated: stats.contestHistory.length,
      problemsSolved: stats.solvedProblemIds.length,
      recentContests: stats.contestHistory.slice(-10),
    };
  }
}
