import { effectiveDurationMinutes } from './contest-duration';

describe('effectiveDurationMinutes', () => {
  it('uses computed minutes from timestamps', () => {
    const starts = new Date('2026-01-01T10:00:00Z');
    const ends = new Date('2026-01-01T12:00:00Z');
    expect(effectiveDurationMinutes(starts, ends, 0)).toBe(120);
  });

  it('falls back to stored minutes', () => {
    const starts = new Date('2026-01-01T10:00:00Z');
    const ends = new Date('2026-01-01T10:00:00Z');
    expect(effectiveDurationMinutes(starts, ends, 90)).toBe(90);
  });
});
