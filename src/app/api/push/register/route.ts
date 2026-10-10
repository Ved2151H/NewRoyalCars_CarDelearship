import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { removePushToken, savePushToken } from '@/lib/push';

export const dynamic = 'force-dynamic';

/**
 * Registers an admin device's FCM token — the single new endpoint the push
 * feature needs.
 *
 * REGISTER — authorised only by the very same httpOnly admin session cookie
 * the website uses. The Android app sends that cookie straight from its
 * WebView cookie jar, so a token can only ever be stored after a real Admin
 * Suite sign-in. A regular website visitor has no session, gets a 401, and
 * can never be added to the notification list.
 *
 * UNREGISTER ({ token, action: 'unregister' }) — called by the app after the
 * admin logs out, i.e. exactly when the session cookie no longer exists, so
 * it cannot be session-authorised. It is instead authorised by possession of
 * the FCM token itself: a long random secret known only to that device and to
 * this database. The handler performs nothing but an exact-match DELETE of
 * that one row — no data is read or written for anyone else.
 */
const registerSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
});

const unregisterSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  action: z.literal('unregister'),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const removal = unregisterSchema.safeParse(payload);
  if (removal.success) {
    try {
      await removePushToken(removal.data.token);
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      console.error('[api/push/register/unregister]', err);
      return NextResponse.json(
        { ok: false, error: 'Could not remove this device' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid device token' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    await savePushToken({
      token: parsed.data.token,
      platform: parsed.data.platform,
      adminId: session.adminId,
      email: session.email,
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[api/push/register]', err);
    return NextResponse.json(
      { ok: false, error: 'Could not store this device' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
