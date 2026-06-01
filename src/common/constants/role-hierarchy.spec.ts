import {
  roleMeetsAnyRequirement,
  roleMeetsRequirement,
} from '@common/constants/role-hierarchy';
import {
  hashToken,
  verifySignedState,
  createSignedState,
} from '@modules/auth/utils/crypto.helpers';
import { deriveUsernameBase } from '@modules/auth/utils/username.helpers';

describe('role hierarchy', () => {
  it('admin satisfies student requirement', () => {
    expect(roleMeetsRequirement('admin', 'student')).toBe(true);
  });

  it('student does not satisfy admin requirement', () => {
    expect(roleMeetsRequirement('student', 'admin')).toBe(false);
  });

  it('roleMeetsAnyRequirement checks multiple roles', () => {
    expect(roleMeetsAnyRequirement('instructor', ['admin', 'ta'])).toBe(true);
    expect(roleMeetsAnyRequirement('student', ['admin', 'super-admin'])).toBe(
      false,
    );
  });
});

describe('crypto helpers', () => {
  it('creates and verifies signed state', () => {
    const state = createSignedState('secret', { next: '/dashboard' }, 60);
    const parsed = verifySignedState<{ next: string }>('secret', state);
    expect(parsed?.next).toBe('/dashboard');
  });

  it('rejects tampered state', () => {
    const state = createSignedState('secret', { next: '/dashboard' }, 60);
    expect(verifySignedState('other-secret', state)).toBeNull();
  });

  it('hashes tokens deterministically', () => {
    expect(hashToken('secret', 'token')).toBe(hashToken('secret', 'token'));
  });
});

describe('username helpers', () => {
  it('derives username from email when name missing', () => {
    expect(deriveUsernameBase(null, 'jane.doe@school.edu')).toBe('jane_doe');
  });
});
