import { prisma } from '@/lib/prisma';
import { mapCar } from '@/lib/mappers';
import App from '@/App';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
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
    console.error('[AdminPage] database fetch failed:', err);
  }

  return <App initialCars={cars} initialBrands={brands} initialAdminEmail={adminEmail} dealershipPhone={dealershipPhone} />;
}
