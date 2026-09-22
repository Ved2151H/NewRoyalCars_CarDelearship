import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'nrc_admin_session';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return new TextEncoder().encode('dev-only-insecure-secret-key-0123456789');
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect every /admin route server-side (except the login surface itself).
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    let valid = false;
    if (token) {
      try {
        await jwtVerify(token, getSecret());
        valid = true;
      } catch {
        valid = false;
      }
    }
    if (!valid) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
