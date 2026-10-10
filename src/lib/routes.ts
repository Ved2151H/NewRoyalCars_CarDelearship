/**
 * Single source of truth for the URL ↔ view mapping.
 *
 * The product is one client-side SPA (see `src/App.tsx`) that Next.js serves
 * through a single catch-all route (`src/app/[[...slug]]/page.tsx`), so the URL
 * is the authoritative navigation state. Reloading, opening a deep link, or
 * pressing Back/Forward all restore the exact same screen from one of these
 * paths:
 *
 *   /                      Home
 *   /cars                  Showroom
 *   /cars/:id              Car details
 *   /about                 About
 *   /contact               Contact
 *   /admin                 Admin suite → Dashboard
 *   /admin/login           Admin sign-in
 *   /admin/<tab>           Admin suite → specific tab
 */
import type { PublicRoute } from '@/components/public/Navbar';
import type { AdminTab } from '@/components/admin/AdminSidebar';

/** Canonical admin section order — mirrors the sidebar. */
export const ADMIN_TABS: readonly AdminTab[] = [
  'dashboard',
  'cars',
  'add-car',
  'enquiries',
  'customers',
  'trash',
  'settings',
  'account',
];

const DEFAULT_TAB: AdminTab = 'dashboard';

export interface AppRouteState {
  /** Which top-level view is showing. */
  route: PublicRoute;
  /** Admin section — only meaningful while `route === 'admin'`. */
  adminTab: AdminTab;
  /** Car being inspected in the public details view. */
  carId: string | null;
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Path segments of a URL, ignoring the query/hash and empty segments. */
export function pathSegments(path: string): string[] {
  const pathname = path.split(/[?#]/)[0] || '/';
  return pathname.split('/').filter(Boolean).map(safeDecode);
}

/** URL → view state. Unknown paths fall back to Home. */
export function parseAppPath(path: string): AppRouteState {
  const [first, second] = pathSegments(path);

  switch (first) {
    case 'admin': {
      const adminTab =
        second && ADMIN_TABS.includes(second as AdminTab) ? (second as AdminTab) : DEFAULT_TAB;
      return { route: 'admin', adminTab, carId: null };
    }
    case 'cars':
      return { route: 'cars', adminTab: DEFAULT_TAB, carId: second ?? null };
    case 'about':
      return { route: 'about', adminTab: DEFAULT_TAB, carId: null };
    case 'contact':
      return { route: 'contact', adminTab: DEFAULT_TAB, carId: null };
    default:
      return { route: 'home', adminTab: DEFAULT_TAB, carId: null };
  }
}

/** View → URL. */
export function pathForRoute(route: PublicRoute): string {
  switch (route) {
    case 'cars':
      return '/cars';
    case 'about':
      return '/about';
    case 'contact':
      return '/contact';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}

export function pathForAdminTab(tab: AdminTab): string {
  return tab === DEFAULT_TAB ? '/admin' : `/admin/${tab}`;
}

export function pathForCar(carId: string): string {
  return `/cars/${encodeURIComponent(carId)}`;
}

/**
 * Where to land after signing in — the admin route the middleware bounced us
 * from (`/admin/login?from=/admin/settings`). Anything that is not a
 * same-origin admin path is ignored.
 */
export function adminReturnPath(search: string): string {
  const from = new URLSearchParams(search).get('from') ?? '';
  return from.startsWith('/admin') && !from.startsWith('//') ? from : '/admin';
}

/**
 * True for every path the SPA actually renders. Everything else is a genuine
 * 404 (unknown API routes, typos, stray deep links…).
 */
export function isKnownAppPath(segments: string[]): boolean {
  if (segments.length === 0) return true; // "/"
  const [first, second] = segments;

  if (first === 'cars') {
    return segments.length === 1 || (segments.length === 2 && Boolean(second));
  }
  if (first === 'about' || first === 'contact') {
    return segments.length === 1;
  }
  if (first === 'admin') {
    if (segments.length === 1) return true;
    return segments.length === 2 && (second === 'login' || ADMIN_TABS.includes(second as AdminTab));
  }
  return false;
}
