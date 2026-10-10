import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { mapCar } from '@/lib/mappers';
import { isKnownAppPath } from '@/lib/routes';
import App from '@/App';

export const dynamic = 'force-dynamic';

/**
 * One catch-all route serves the whole SPA shell.
 *
 * Every screen (`/`, `/cars`, `/cars/:id`, `/about`, `/contact`, `/admin`,
 * `/admin/login`, `/admin/<tab>`) renders the exact same client component, so
 * in-app navigation never swaps React trees — the client router keeps the shell
 * mounted and the URL decides what it shows. Direct hits and hard reloads come
 * here too, which is why a refresh now stays on the page you were looking at.
 *
 * `/admin/*` stays protected: the middleware in `src/middleware.ts` redirects
 * unauthenticated requests to `/admin/login`, and the admin server actions
 * re-check the session on every call.
 */
export default async function AppPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (!isKnownAppPath(slug ?? [])) notFound();

  let cars: Awaited<ReturnType<typeof mapCar>>[] = [];
  let brands: string[] = [];
  let adminEmail = 'admin@newroyalcars.com';
  let dealershipPhone = '';

  try {
    const [rows, brandRows, admin, settings] = await Promise.all([
      prisma.car.findMany({ where: { deletedAt: null }, include: { images: true }, orderBy: { createdAt: 'desc' } }),
      prisma.car.findMany({ where: { deletedAt: null }, select: { brand: true }, distinct: ['brand'], orderBy: { brand: 'asc' } }),
      prisma.admin.findFirst({ select: { email: true } }),
      prisma.dealerSettings.findFirst({ select: { contactPhone: true } }),
    ]);
    cars = rows.map(mapCar);
    brands = brandRows.map((b) => b.brand);
    if (admin) adminEmail = admin.email;
    if (settings?.contactPhone) dealershipPhone = settings.contactPhone;
  } catch (err) {
    // Showroom renders empty rather than crashing if the DB is briefly unreachable.
    console.error('[AppPage] database fetch failed:', err);
  }

  return <App initialCars={cars} initialBrands={brands} initialAdminEmail={adminEmail} dealershipPhone={dealershipPhone} />;
}
