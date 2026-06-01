export type PlatformIntegrationCategory = 'competitive_programming' | 'ctf';

export type PlatformIntegrationStatus = 'live' | 'beta' | 'coming_soon';

export type PlatformIntegration = {
  id: string;
  name: string;
  category: PlatformIntegrationCategory;
  status: PlatformIntegrationStatus;
  description: string;
  externalUrl: string;
  linkHost?: string;
};

export const PLATFORM_CATEGORIES: Record<
  PlatformIntegrationCategory,
  { label: string; description: string }
> = {
  competitive_programming: {
    label: 'Competitive programming',
    description: 'Contests and practice across major CP platforms.',
  },
  ctf: {
    label: 'CTF & security',
    description: 'Capture-the-flag events and training.',
  },
};

export const PLATFORM_INTEGRATIONS: PlatformIntegration[] = [
  {
    id: 'codeforces',
    name: 'Codeforces',
    category: 'competitive_programming',
    status: 'live',
    description: 'Contests, practice problemset, and submission analytics.',
    externalUrl: 'https://codeforces.com',
    linkHost: 'codeforces',
  },
  {
    id: 'leetcode',
    name: 'LeetCode',
    category: 'competitive_programming',
    status: 'live',
    description: 'Weekly contests and practice problems.',
    externalUrl: 'https://leetcode.com',
    linkHost: 'leetcode',
  },
  {
    id: 'atcoder',
    name: 'AtCoder',
    category: 'competitive_programming',
    status: 'live',
    description: 'Rated contests and problem archive.',
    externalUrl: 'https://atcoder.jp',
    linkHost: 'atcoder',
  },
  {
    id: 'codechef',
    name: 'CodeChef',
    category: 'competitive_programming',
    status: 'live',
    description: 'Long and short format contests.',
    externalUrl: 'https://www.codechef.com',
    linkHost: 'codechef',
  },
  {
    id: 'hackerrank',
    name: 'HackerRank',
    category: 'competitive_programming',
    status: 'live',
    description: 'Skills assessments and contest ratings.',
    externalUrl: 'https://www.hackerrank.com',
    linkHost: 'hackerrank',
  },
  {
    id: 'ctftime',
    name: 'CTFtime',
    category: 'ctf',
    status: 'live',
    description: 'CTF event calendar.',
    externalUrl: 'https://ctftime.org',
    linkHost: 'ctftime',
  },
];
