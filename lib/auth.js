import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { getSessionByToken, getUserById } from './db.js';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    return timingSafeEqual(Buffer.from(hash, 'hex'), derived);
  } catch {
    return false;
  }
}

export function generateToken() {
  return randomBytes(32).toString('hex');
}

/** Returns the user row for the current request's session cookie, or null. */
export function getSessionUser(request) {
  const token = request.cookies.get('session_token')?.value;
  if (!token) return null;
  const session = getSessionByToken(token);
  if (!session || new Date(session.expires_at) < new Date()) return null;
  return getUserById(session.user_id);
}

/** Session cookie options (set / clear). */
export function sessionCookieOptions(token, expiresAt) {
  return [
    `session_token=${token}`,
    `Expires=${new Date(expiresAt).toUTCString()}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ].join('; ');
}

export function clearCookieOptions() {
  return 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax';
}
