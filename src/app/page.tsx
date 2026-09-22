import { prisma } from '@/lib/prisma';
import { mapCar } from '@/lib/mappers';
import App from '@/App';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let cars: Awaited<ReturnType<typeof mapCar>>[] = [];
  let brands: string[] = [];
  let adminEmail = 'admin@newroyalcars.com';

  try {
    const [rows, brandRows, admin] = await Promise.all([
      prisma.car.findMany({ include: { images: true }, orderBy: { createdAt: 'desc' } }),
      prisma.car.findMany({ select: { brand: true }, distinct: ['brand'], orderBy: { brand: 'asc' } }),
      prisma.admin.findFirst({ select: { email: true } }),
    ]);
    cars = rows.map(mapCar);
    brands = brandRows.map((b) => b.brand);
    if (admin) adminEmail = admin.email;
  } catch (err) {
    // Showroom renders empty rather than crashing if the DB is briefly unreachable.
    console.error('[HomePage] database fetch failed:', err);
  }

  return <App initialCars={cars} initialBrands={brands} adminEmail={adminEmail} />;
}
