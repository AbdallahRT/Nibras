export const ROLE_HIERARCHY = [
  'super-admin',
  'admin',
  'instructor',
  'ta',
  'student',
] as const;

export type RoleName = (typeof ROLE_HIERARCHY)[number];

const roleRank = new Map<string, number>(
  ROLE_HIERARCHY.map((role, index) => [role, index]),
);

/** Returns true if `userRole` meets or exceeds `requiredRole` in the hierarchy. */
export function roleMeetsRequirement(
  userRole: string,
  requiredRole: string,
): boolean {
  const userRank = roleRank.get(userRole);
  const requiredRank = roleRank.get(requiredRole);
  if (userRank === undefined || requiredRank === undefined) {
    return userRole === requiredRole;
  }
  return userRank <= requiredRank;
}

export function roleMeetsAnyRequirement(
  userRole: string,
  requiredRoles: string[],
): boolean {
  return requiredRoles.some((required) =>
    roleMeetsRequirement(userRole, required),
  );
}
