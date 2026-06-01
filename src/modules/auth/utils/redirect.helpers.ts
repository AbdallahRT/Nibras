export function sanitizeNextPath(
  candidate: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }
  return candidate;
}

export function resolveSafeReturnTo(
  candidate: string | undefined,
  webBaseUrl: string,
): string {
  const fallback = new URL(webBaseUrl);
  if (!candidate) {
    return fallback.toString();
  }
  try {
    const resolved = new URL(candidate, fallback);
    if (!['http:', 'https:'].includes(resolved.protocol)) {
      return fallback.toString();
    }
    if (resolved.origin !== fallback.origin) {
      return fallback.toString();
    }
    return resolved.toString();
  } catch {
    return fallback.toString();
  }
}

export function buildAuthCompleteRedirect(
  webBaseUrl: string,
  sessionToken: string,
  nextPath: string,
): string {
  const url = new URL('/auth/complete', webBaseUrl);
  url.searchParams.set('st', sessionToken);
  url.searchParams.set('next', sanitizeNextPath(nextPath));
  return url.toString();
}

export function buildWebSessionCookie(
  sessionToken: string,
  options: { secure: boolean; maxAgeSeconds: number },
): string {
  const parts = [
    `nibras_web_session=${encodeURIComponent(sessionToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${options.maxAgeSeconds}`,
  ];
  if (options.secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}
