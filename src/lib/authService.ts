import crypto from 'crypto';
import type { UserRole } from '../types.ts';

export interface FacilityCredential {
  membershipId: string;
  facilityId: string;
  normalizedUsername: string;
  salt: string;
  passwordHash: string;
  algorithm: 'scrypt';
  updatedAt: string;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  membershipId: string;
  facilityId: string;
  facilityCode: string;
  role: UserRole;
  permissions: string[];
  username: string;
  displayName: string;
  email: string;
  isPlatformAdmin?: boolean;
  createdAt: number;
  expiresAt: number;
}

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'cornerbrief_enterprise_session_secret_2026_scrypt_hmac';

/**
 * Hashes a plaintext password using standard scrypt with a random 16-byte salt.
 * Never stores or logs plaintext passwords.
 */
export function hashPassword(password: string): { salt: string; hash: string } {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    salt,
    hash: derivedKey.toString('hex'),
  };
}

/**
 * Verifies a password against a stored salt and hash using timingSafeEqual
 * to protect against timing analysis attacks.
 */
export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): boolean {
  if (!password || !salt || !expectedHash) {
    return false;
  }
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (derivedKey.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Creates an HMAC-SHA256 signed session token.
 */
export function createSessionToken(sessionId: string): string {
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(sessionId)
    .digest('hex');
  return `cb_sess_${sessionId}.${signature}`;
}

/**
 * Verifies and extracts the sessionId from a signed session token.
 */
export function verifySessionToken(token: string): string | null {
  if (!token || typeof token !== 'string' || !token.startsWith('cb_sess_')) {
    return null;
  }
  const parts = token.slice(8).split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [sessionId, providedSignature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(sessionId)
    .digest('hex');

  const providedBuf = Buffer.from(providedSignature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (
    providedBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return sessionId;
  }
  return null;
}

// In-Memory Login Rate Limiter (Brute-Force Guard)
const loginAttemptMap = new Map<string, { count: number; windowStart: number }>();

export function checkLoginRateLimit(ip: string, hospitalCode: string): {
  allowed: boolean;
  remainingMs?: number;
} {
  const key = `${ip}_${hospitalCode.toUpperCase()}`;
  const now = Date.now();
  const WINDOW_MS = 5 * 60 * 1000; // 5 minutes window
  const MAX_ATTEMPTS = 10; // Max 10 attempts per 5 minutes

  const entry = loginAttemptMap.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    loginAttemptMap.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const remainingMs = WINDOW_MS - (now - entry.windowStart);
    return { allowed: false, remainingMs };
  }

  entry.count += 1;
  return { allowed: true };
}

export function resetLoginRateLimit(ip: string, hospitalCode: string): void {
  const key = `${ip}_${hospitalCode.toUpperCase()}`;
  loginAttemptMap.delete(key);
}
