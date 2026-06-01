import type { PlatformFetcher } from './types';
import { codeforcesFetcher } from './codeforces';
import { leetcodeFetcher } from './leetcode';
import { atcoderFetcher } from './atcoder';
import { codechefFetcher } from './codechef';
import { ctftimeFetcher } from './ctftime';
import { hackerrankFetcher } from './hackerrank';

export type {
  RawContest,
  RawProblem,
  RawUserStats,
  PlatformFetcher,
} from './types';
export { pickVerificationProblem } from './codeforces';

export const fetchers: Record<string, PlatformFetcher> = {
  codeforces: codeforcesFetcher,
  leetcode: leetcodeFetcher,
  atcoder: atcoderFetcher,
  codechef: codechefFetcher,
  ctftime: ctftimeFetcher,
  hackerrank: hackerrankFetcher,
};
