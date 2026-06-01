export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  role: string;
  roleId: string;
  permissions: string[];
  reputationScore: number;
  githubLinked: boolean;
  emailVerified: boolean;
  institution?: string;
  preferences: Record<string, unknown>;
}
