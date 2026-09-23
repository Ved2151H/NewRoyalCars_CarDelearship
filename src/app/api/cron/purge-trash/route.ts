import { NextRequest, NextResponse } from 'next/server';
import { purgeExpiredTrash } from '@/lib/actions/trash';

/**
 * Secured cron endpoint — permanently removes Trash items whose 15-day
 * retention has expired. Vercel Cron calls it with the
 * `Authorization: Bearer ${CRON_SECRET}` header, which Vercel injects
 * automatically when CRON_SECRET is set in the project environment.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail closed in production: no secret configured = endpoint disabled.
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await purgeExpiredTrash();
    return NextResponse.json({ ok: true, purged: result, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error('[cron/purge-trash]', err);
    return NextResponse.json({ error: 'Purge failed' }, { status: 500 });
  }
}
