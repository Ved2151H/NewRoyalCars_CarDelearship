'use server';

import { loginAdmin, destroySession, getSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { firstZodError, type ActionResult } from '@/lib/utils';

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: firstZodError(parsed.error) };
  }

  // Brute-force guard: 5 attempts per email per 5 minutes.
  const rl = rateLimit(`login:${parsed.data.email}`, 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    return { ok: false, error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` };
  }

  try {
    return await loginAdmin(parsed.data.email, parsed.data.password);
  } catch (err) {
    console.error('[loginAction]', err);
    return { ok: false, error: 'Sign-in failed. Please try again.' };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    await destroySession();
    return { ok: true };
  } catch (err) {
    console.error('[logoutAction]', err);
    return { ok: false, error: 'Logout failed. Please try again.' };
  }
}

/**
 * Session restore check — lets the client recover authentication state after
 * a page reload. Reads only the verified httpOnly cookie session; no
 * sensitive data crosses the wire.
 */
export async function checkSessionAction(): Promise<
  ActionResult<{ authenticated: boolean; email: string | null; name: string | null }>
> {
  try {
    const session = await getSession();
    return {
      ok: true,
      data: { authenticated: Boolean(session), email: session?.email ?? null, name: session?.name ?? null },
    };
  } catch (err) {
    console.error('[checkSessionAction]', err);
    return { ok: true, data: { authenticated: false, email: null, name: null } };
  }
}
