'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { imageStorage, storageKeyFromUrl } from '@/lib/storage';
import type { ActionResult } from '@/lib/utils';
import { TRASH_RETENTION_DAYS, type DeletedCarItem, type DeletedEnquiryItem } from '@/lib/trash';

export interface PurgeReport {
  dbDeleted: boolean;
  objectsRemoved: number;
  objectsFailed: string[];
  verifiedDbGone: boolean;
  verifiedStorageGone: boolean;
}

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
   PERMANENT DELETE — full cascade: DB record(s), related rows and
   every storage object that belongs exclusively to the car. Trash and
   restore never call this, so soft-deleted cars stay fully restorable.
   ================================================================== */

/**
 * Shared purge worker.
 *
 * Order matters for consistency:
 *   1. Delete the Car row — a single conditional DELETE (Postgres cascades
 *      CarImage and Booking rows, detaches Enquiries via SetNull), guarded by
 *      the still-in-Trash condition so a concurrent restore can race safely.
 *   2. Only after the DB commit, remove each storage object, retrying once.
 *   3. Verify: the car must no longer exist in Neon Postgres and every object
 *      must be absent from storage. Failures are returned, never hidden.
 *
 * If storage removal fails, the DB row is already gone (the source of truth),
 * and the report names the orphaned keys so they can be cleaned up.
 */
async function purgeCar(carId: string, keys: string[]): Promise<PurgeReport> {
  // 1. DB deletion — conditioned on still being in the Trash so a restore
  //    racing this delete wins and the purge becomes a no-op.
  const deleted = await prisma.car.deleteMany({
    where: { id: carId, deletedAt: { not: null } },
  });
  if (deleted.count === 0) {
    return {
      dbDeleted: false,
      objectsRemoved: 0,
      objectsFailed: [],
      verifiedDbGone: false,
      verifiedStorageGone: false,
    };
  }

  // 2. Storage cleanup — the caller snapshots the keys BEFORE the DB delete
  //    cascades the CarImage rows (and the key information) away. Each object
  //    gets one retry; failures are collected, never swallowed.
  const objectsFailed: string[] = [];
  let objectsRemoved = 0;
  for (const key of keys) {
    let ok = true;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await imageStorage.remove(key);
        ok = true;
        break;
      } catch (err) {
        ok = false;
        console.error('[purgeCar] storage removal failed', key, err);
      }
    }
    if (ok) objectsRemoved++;
    else objectsFailed.push(key);
  }

  // 3. Verification — the DB row must be gone, and every targeted object must
  //    be absent from storage.
  const verifiedDbGone = (await prisma.car.findUnique({ where: { id: carId }, select: { id: true } })) === null;
  let verifiedStorageGone = true;
  for (const key of keys) {
    if (await imageStorage.exists(key)) {
      verifiedStorageGone = false;
      break;
    }
  }

  return { dbDeleted: true, objectsRemoved, objectsFailed, verifiedDbGone, verifiedStorageGone };
}

export async function purgeCarAction(carId: string): Promise<ActionResult<PurgeReport>> {
  try {
    await requireAdmin();
    // Only purge cars that are actually in the Trash.
    const car = await prisma.car.findFirst({
      where: { id: carId, deletedAt: { not: null } },
      include: { images: { select: { publicId: true, imageUrl: true } } },
    });
    if (!car) return { ok: false, error: 'Car not found in Trash.' };

    // Snapshot every storage key owned by this car BEFORE deletion — the
    // cascade removes the CarImage rows and with them the key information.
    const keys = new Set<string>();
    for (const img of car.images) {
      if (img.publicId) {
        keys.add(img.publicId);
        continue;
      }
      const fromUrl = storageKeyFromUrl(img.imageUrl);
      if (fromUrl) keys.add(fromUrl); // null = foreign host → shared, skip
    }

    const report = await purgeCar(carId, [...keys]);

    if (!report.dbDeleted) {
      return { ok: false, error: 'Car not found in Trash.' };
    }

    revalidatePath('/');
    revalidatePath('/admin');

    if (report.objectsFailed.length > 0 || !report.verifiedStorageGone) {
      const names = [...new Set([...report.objectsFailed])].join(', ');
      console.error('[purgeCarAction] partial storage purge', carId, report);
      return {
        ok: false,
        error: `The vehicle was deleted from the database, but ${report.objectsFailed.length} photo file(s) could not be removed from storage${names ? `: ${names}` : ''}. They can be cleaned up later without affecting the website.`,
      };
    }
    return { ok: true, data: report };
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
    include: { images: { select: { publicId: true, imageUrl: true } } },
  });
  for (const car of expiredCars) {
    // Same key snapshot + full-cascade purge as the manual Trash action.
    const keys = new Set<string>();
    for (const img of car.images) {
      if (img.publicId) {
        keys.add(img.publicId);
        continue;
      }
      const fromUrl = storageKeyFromUrl(img.imageUrl);
      if (fromUrl) keys.add(fromUrl);
    }
    const report = await purgeCar(car.id, [...keys]).catch((e) => {
      console.error('[purgeExpiredTrash] car', car.id, e);
      return null;
    });
    if (report && (report.objectsFailed.length > 0 || !report.verifiedStorageGone)) {
      console.error('[purgeExpiredTrash] orphaned storage keys for car', car.id, report.objectsFailed);
    }
  }

  const expiredEnquiries = await prisma.enquiry.deleteMany({
    where: { deletedAt: { not: null, lt: cutoff } },
  });

  // Refresh cached public/admin pages so purged items vanish immediately.
  if (expiredCars.length > 0) {
    revalidatePath('/');
  }
  if (expiredCars.length > 0 || expiredEnquiries.count > 0) {
    revalidatePath('/admin');
  }

  return { cars: expiredCars.length, enquiries: expiredEnquiries.count };
}
