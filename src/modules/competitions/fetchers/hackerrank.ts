import { rateLimited } from './rate-limiter';
import type { PlatformFetcher, RawUserStats } from './types';

const BASE = 'https://www.hackerrank.com/rest';
const DELAY_MS = 1500;

async function hrGet<T>(path: string): Promise<T> {
  return rateLimited('hackerrank', DELAY_MS, async () => {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HackerRank API ${res.status}`);
    return (await res.json()) as T;
  });
}

export const hackerrankFetcher: PlatformFetcher = {
  async fetchContests() {
    return await Promise.resolve([]);
  },

  async fetchProblems() {
    return await Promise.resolve([]);
  },

  async verifyHandle(handle: string) {
    try {
      const data = await hrGet<{ model?: { username?: string } }>(
        `/hackers/${encodeURIComponent(handle)}/profile`,
      );
      return { valid: Boolean(data.model?.username) };
    } catch {
      return { valid: false };
    }
  },

  async fetchUserStats(handle: string): Promise<RawUserStats> {
    try {
      const data = await hrGet<{
        model?: {
          contest_rating?: number;
          contest_rating_peak?: number;
        };
      }>(`/hackers/${encodeURIComponent(handle)}/profile`);
      const rating = data.model?.contest_rating ?? 0;
      const maxRating = data.model?.contest_rating_peak ?? rating;
      return {
        rating,
        maxRating,
        contestHistory: [],
        solvedProblemIds: [],
      };
    } catch {
      return {
        rating: 0,
        maxRating: 0,
        contestHistory: [],
        solvedProblemIds: [],
      };
    }
  },
};
