import { pickVerificationProblem } from './codeforces';

describe('pickVerificationProblem', () => {
  it('returns a valid verification problem', () => {
    const p = pickVerificationProblem();
    expect(p.contestId).toBeGreaterThan(0);
    expect(p.index).toBeTruthy();
    expect(p.name).toBeTruthy();
  });
});
