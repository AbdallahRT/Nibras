import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function signPayload(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSignedState(
  secret: string,
  payload: Record<string, string>,
  ttlSeconds: number,
): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const body = JSON.stringify({ ...payload, expiresAt });
  const signature = signPayload(secret, body);
  return Buffer.from(JSON.stringify({ body, signature })).toString('base64url');
}

export function verifySignedState<T extends Record<string, unknown>>(
  secret: string,
  state: string,
): T | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf8'),
    ) as { body: string; signature: string };
    const expected = signPayload(secret, parsed.body);
    const sigBuf = Buffer.from(parsed.signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const data = JSON.parse(parsed.body) as T & { expiresAt: number };
    if (typeof data.expiresAt !== 'number' || data.expiresAt < Date.now()) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function hashToken(secret: string, token: string): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
