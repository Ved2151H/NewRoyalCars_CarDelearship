'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { imageStorage } from '@/lib/storage';
import type { ActionResult } from '@/lib/utils';
import { TRASH_RETENTION_DAYS, type DeletedCarItem, type DeletedEnquiryItem } from '@/lib/trash';

function expiresAt(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/* ==================================================================
   LIST — deleted cars & enquiries (admin only)
   ================================================================== */

function retentionFields(deletedAt: Date) {
  const exp = expiresAt(deletedAt);
  return { expiresAt: exp.toISOString(), expired: exp.getTime() <= Date.now() };
}

export async function getDeletedCarsAction(
  search?: string
): Promise<ActionResult<DeletedCarItem[]>> {
  try {
    await requireAdmin();
    const q = search?.trim();
    const cars = await prisma.car.findMany({
      where: {
        deletedAt: { not: null },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { carNumber: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      orderBy: { deletedAt: 'desc' },
    });

    return {
      ok: true,
      data: cars.flatMap((c) => {
        if (!c.deletedAt) return [];
        return [
          {
            id: c.id,
            name: c.name,
            carNumber: c.carNumber,
            price: c.price,
            imageUrl: c.images[0]?.imageUrl ?? null,
            deletedAt: c.deletedAt.toISOString(),
            ...retentionFields(c.deletedAt),
          },
        ];
      }),
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[getDeletedCarsAction]', err);
    return { ok: false, error: 'Could not load deleted cars.' };
  }
}

export async function getDeletedEnquiriesAction(
  search?: string
): Promise<ActionResult<DeletedEnquiryItem[]>> {
  try {
    await requireAdmin();
    const q = search?.trim();
    const rows = await prisma.enquiry.findMany({
      where: {
        deletedAt: { not: null },
        ...(q
          ? {
              OR: [
                { customerName: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      include: { car: { select: { name: true } } },
      orderBy: { deletedAt: 'desc' },
    });

    return {
      ok: true,
      data: rows.flatMap((e) => {
        if (!e.deletedAt) return [];
        return [
          {
            id: e.id,
            customerName: e.customerName,
            phone: e.phone,
            city: e.city ?? '',
            carName: e.car?.name ?? 'General Royal Fleet Inquiry',
            deletedAt: e.deletedAt.toISOString(),
            ...retentionFields(e.deletedAt),
          },
        ];
      }),
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[getDeletedEnquiriesAction]', err);
    return { ok: false, error: 'Could not load deleted enquiries.' };
  }
}

/* ==================================================================
   RESTORE — remove the soft-delete marker
   ================================================================== */

export async function restoreCarAction(carId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.car.updateMany({
      where: { id: carId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[restoreCarAction]', err);
    return { ok: false, error: 'Could not restore the vehicle.' };
  }
}

export async function restoreEnquiryAction(enquiryId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.enquiry.updateMany({
      where: { id: enquiryId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[restoreEnquiryAction]', err);
    return { ok: false, error: 'Could not restore the enquiry.' };
  }
}

/* ==================================================================
   PERMANENT DELETE — real deletion + storage cleanup
   ================================================================== */

/** Shared worker: purges one car's storage objects + DB row. */
async function purgeCar(carId: string): Promise<void> {
  const car = await prisma.car.findUnique({
    where: { id: carId },
    include: { images: true },
  });
  if (!car) return;

  // DB first (cascades CarImage rows), then best-effort storage cleanup so a
  // storage failure can never leave a half-deleted DB state behind.
  await prisma.car.delete({ where: { id: carId } });
  for (const img of car.images) {
    if (img.publicId) {
      await imageStorage.remove(img.publicId).catch((e) => {
        console.error('[purgeCar] storage cleanup failed for', img.publicId, e);
      });
    }
  }
}

export async function purgeCarAction(carId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    // Only purge cars that are actually in the Trash.
    const car = await prisma.car.findFirst({ where: { id: carId, deletedAt: { not: null } } });
    if (!car) return { ok: false, error: 'Car not found in Trash.' };
    await purgeCar(carId);
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[purgeCarAction]', err);
    return { ok: false, error: 'Could not permanently delete the vehicle.' };
  }
}

export async function purgeEnquiryAction(enquiryId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const result = await prisma.enquiry.deleteMany({
      where: { id: enquiryId, deletedAt: { not: null } },
    });
    if (result.count === 0) return { ok: false, error: 'Enquiry not found in Trash.' };
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[purgeEnquiryAction]', err);
    return { ok: false, error: 'Could not permanently delete the enquiry.' };
  }
}

/* ==================================================================
   RETENTION CLEANUP — runs from the secured cron endpoint.
   Purges every item whose deletedAt + 15 days has passed.
   Returns how many items were permanently removed.
   ================================================================== */

export async function purgeExpiredTrash(): Promise<{ cars: number; enquiries: number }> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const expiredCars = await prisma.car.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true },
  });
  for (const car of expiredCars) {
    await purgeCar(car.id).catch((e) => console.error('[purgeExpiredTrash] car', car.id, e));
  }

  const expiredEnquiries = await prisma.enquiry.deleteMany({
    where: { deletedAt: { not: null, lt: cutoff } },
  });

  return { cars: expiredCars.length, enquiries: expiredEnquiries.count };
}
