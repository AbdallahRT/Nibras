import {
  buildHackerRankMetadata,
  hackerrankFetcher,
  HR_CERTIFICATIONS_NOTE,
  mapBadgeModels,
} from './hackerrank';

describe('mapBadgeModels', () => {
  it('maps HackerRank badge models to normalized skills', () => {
    const skills = mapBadgeModels([
      {
        badge_type: 'sql',
        badge_name: 'Sql',
        stars: 4,
        level: 2,
        upcoming_level: 'gold',
        current_points: 480,
        solved: 38,
        total_challenges: 58,
      },
    ]);

    expect(skills).toEqual([
      {
        id: 'sql',
        name: 'Sql',
        stars: 4,
        level: 'gold',
        points: 480,
        solved: 38,
        totalChallenges: 58,
      },
    ]);
  });

  it('skips entries without badge_type or badge_name', () => {
    expect(mapBadgeModels([{ stars: 1 }, { badge_type: 'x' }])).toEqual([]);
  });
});

describe('buildHackerRankMetadata', () => {
  it('includes certifications note and empty certifications', () => {
    const meta = buildHackerRankMetadata([]);
    expect(meta.certifications).toEqual([]);
    expect(meta.certificationsNote).toBe(HR_CERTIFICATIONS_NOTE);
    expect(meta.skills).toEqual([]);
    expect(meta.syncedAt).toBeDefined();
  });

  it('records badges sync errors', () => {
    const meta = buildHackerRankMetadata([], 'HackerRank API 403');
    expect(meta.badgesSyncError).toBe('HackerRank API 403');
  });
});

describe('hackerrankFetcher.fetchUserStats', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('merges profile ratings and badge skills into metadata', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/profile')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              model: { contest_rating: 1200, contest_rating_peak: 1500 },
            }),
        });
      }
      if (String(url).includes('/badges')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [
                {
                  badge_type: 'python',
                  badge_name: 'Python',
                  stars: 3,
                },
              ],
            }),
        });
      }
      return Promise.reject(new Error('unexpected url'));
    }) as typeof fetch;

    const stats = await hackerrankFetcher.fetchUserStats('testuser');

    expect(stats.rating).toBe(1200);
    expect(stats.maxRating).toBe(1500);
    expect(stats.metadata?.skills).toEqual([
      { id: 'python', name: 'Python', stars: 3, level: undefined },
    ]);
    expect(stats.metadata?.certifications).toEqual([]);
  });

  it('still returns metadata when profile fetch fails', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/profile')) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      if (String(url).includes('/badges')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [{ badge_type: 'java', badge_name: 'Java', stars: 1 }],
            }),
        });
      }
      return Promise.reject(new Error('unexpected url'));
    }) as typeof fetch;

    const stats = await hackerrankFetcher.fetchUserStats('testuser');

    expect(stats.rating).toBe(0);
    expect(stats.metadata?.skills).toHaveLength(1);
  });

  it('records badges error when badges fetch fails', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/profile')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ model: { contest_rating: 900 } }),
        });
      }
      if (String(url).includes('/badges')) {
        return Promise.resolve({ ok: false, status: 503 });
      }
      return Promise.reject(new Error('unexpected url'));
    }) as typeof fetch;

    const stats = await hackerrankFetcher.fetchUserStats('testuser');

    expect(stats.metadata?.skills).toEqual([]);
    expect(stats.metadata?.badgesSyncError).toContain('503');
  });
});
