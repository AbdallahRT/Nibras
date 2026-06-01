export enum CompPlatform {
  Internal = 'internal',
  Codeforces = 'codeforces',
  Leetcode = 'leetcode',
  Atcoder = 'atcoder',
  Codechef = 'codechef',
  Ctftime = 'ctftime',
  Hackerrank = 'hackerrank',
}

export enum AccountVerificationStatus {
  Pending = 'pending',
  Verified = 'verified',
  Failed = 'failed',
}

export enum ContestStatus {
  Draft = 'draft',
  Scheduled = 'scheduled',
  Active = 'active',
  Ended = 'ended',
  Archived = 'archived',
}

export enum ScoringMode {
  Icpc = 'icpc',
  Ioi = 'ioi',
}

export enum SubmissionStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  WrongAnswer = 'wrong_answer',
  TimeLimitExceeded = 'time_limit_exceeded',
  MemoryLimitExceeded = 'memory_limit_exceeded',
  RuntimeError = 'runtime_error',
  CompilationError = 'compilation_error',
}

export const SYNC_PLATFORMS = [
  CompPlatform.Codeforces,
  CompPlatform.Leetcode,
  CompPlatform.Atcoder,
  CompPlatform.Codechef,
  CompPlatform.Ctftime,
] as const;

export const PROBLEM_SYNC_PLATFORMS = [
  CompPlatform.Codeforces,
  CompPlatform.Leetcode,
  CompPlatform.Atcoder,
  CompPlatform.Codechef,
] as const;

export const RANKING_PLATFORMS = [
  'all',
  'codeforces',
  'leetcode',
  'atcoder',
  'codechef',
] as const;
