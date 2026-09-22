import 'server-only';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SESSION_COOKIE = 'nrc_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Fail closed in production; dev convenience fallback keeps local dev unblocked.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET must be set in production');
    }
    return new TextEncoder().encode('dev-only-insecure-secret-key-0123456789');
  }
  return new TextEncoder().encode(secret);
}

/* ---------------- password hashing (scrypt) ---------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split(':');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/* ---------------- session management (JWT in httpOnly cookie) ---------------- */

export interface SessionPayload {
  adminId: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      adminId: String(payload.adminId),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError('Unauthorized');
  return session;
}

export async function requireSuperAdmin(): Promise<SessionPayload> {
  const session = await requireAdmin();
  if (session.role !== 'SUPER_ADMIN') throw new AuthError('Forbidden — super admin only');
  return session;
}

export class AuthError extends Error {}

/* ---------------- login / logout flows ---------------- */

export async function loginAdmin(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Uniform error whether the account or password fails — no user enumeration.
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return { ok: false, error: 'Invalid email or password. Access denied.' };
  }
  await createSession({
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
  return { ok: true };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
