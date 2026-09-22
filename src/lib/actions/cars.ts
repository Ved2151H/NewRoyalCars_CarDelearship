'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import {
  carInputSchema,
  imageActionSchema,
  reorderImagesSchema,
  deleteImageSchema,
  setPrimaryImageSchema,
} from '@/lib/validation';
import { fromAvailability } from '@/lib/mappers';
import { imageStorage, MAX_IMAGES_PER_CAR } from '@/lib/storage';
import { firstZodError, zodFieldErrors, type ActionResult } from '@/lib/utils';
import type { Car } from '@/types';

/**
 * Accepts only http(s) URLs or app-relative /uploads paths — never blob/data
 * URLs. Block-level previews must be uploaded to real storage first.
 */
function isSavableImageUrl(url: string): boolean {
  if (url.startsWith('/uploads/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseImageList(formData: FormData): {
  urls: string[];
  publicIds: Record<string, string>;
} {
  let rawUrls: unknown = [];
  let rawIds: unknown = {};
  try {
    rawUrls = JSON.parse(String(formData.get('imageUrls') || '[]'));
  } catch {
    /* handled below */
  }
  try {
    rawIds = JSON.parse(String(formData.get('imagePublicIds') || '{}'));
  } catch {
    /* optional field */
  }

  const urls = Array.isArray(rawUrls) ? rawUrls.filter((u): u is string => typeof u === 'string') : [];
  const publicIds: Record<string, string> = {};
  if (rawIds && typeof rawIds === 'object') {
    for (const [url, id] of Object.entries(rawIds as Record<string, unknown>)) {
      if (typeof id === 'string' && id.length > 0) publicIds[url] = id;
    }
  }
  return { urls, publicIds };
}

/* ==================================================================
   ADMIN — CAR CRUD
   ================================================================== */

export async function saveCarAction(
  formData: FormData
): Promise<ActionResult<{ carId: string }>> {
  try {
    await requireAdmin();

    const parsed = carInputSchema.safeParse(JSON.parse(String(formData.get('payload') || '{}')));
    if (!parsed.success) {
      return {
        ok: false,
        error: firstZodError(parsed.error),
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }
    const data = parsed.data;

    const payload = {
      name: data.name,
      brand: data.brand,
      model: data.model,
      carNumber: data.carNumber,
      acAvailable: data.acAvailable,
      price: data.price,
      numberOfOwners: data.numberOfOwners,
      kmFrom: data.kmFrom,
      kmTo: data.kmTo,
      fuelType: data.fuelType,
      transmission: data.transmission,
      year: data.year,
      description: data.description || null,
      status: data.status,
      features: data.features,
      color: data.color || null,
      engine: data.engine || null,
      insuranceValidity: data.insuranceValidity || null,
      registrationRTO: data.registrationRTO || null,
    };

    const { urls: imageUrls, publicIds: imagePublicIds } = parseImageList(formData);

    if (imageUrls.some((u) => !isSavableImageUrl(u))) {
      return {
        ok: false,
        error: 'One or more photos were not uploaded correctly. Please re-add them and save again.',
      };
    }
    if (imageUrls.length > MAX_IMAGES_PER_CAR) {
      return { ok: false, error: `Maximum ${MAX_IMAGES_PER_CAR} images per car.` };
    }

    const existingId = String(formData.get('carId') || '');
    const isEdit = Boolean(existingId);

    if (isEdit) {
      const existing = await prisma.car.findUnique({
        where: { id: existingId },
        include: { images: true },
      });
      if (!existing) return { ok: false, error: 'Car not found.' };

      const dupe = await prisma.car.findFirst({
        where: { carNumber: data.carNumber, NOT: { id: existingId } },
      });
      if (dupe) return { ok: false, error: 'Another car already uses this RC number.' };

      // Compute removals outside the transaction so storage cleanup can run
      // after the DB commit.
      const currentUrls = new Set(existing.images.map((i) => i.imageUrl));
      const nextUrls = new Set(imageUrls);
      const toDelete = existing.images.filter((i) => !nextUrls.has(i.imageUrl));

      await prisma.$transaction(async (tx) => {
        await tx.car.update({ where: { id: existingId }, data: payload });

        // Sync images: delete removed ones, add new ones, keep order stable.
        await tx.carImage.deleteMany({ where: { id: { in: toDelete.map((i) => i.id) } } });

        let order = 0;
        for (const url of imageUrls) {
          if (currentUrls.has(url)) {
            await tx.carImage.updateMany({
              where: { carId: existingId, imageUrl: url },
              data: { sortOrder: order++ },
            });
          } else {
            await tx.carImage.create({
              data: {
                carId: existingId,
                imageUrl: url,
                sortOrder: order++,
                publicId: imagePublicIds[url] ?? null,
              },
            });
          }
        }
      });

      // After the DB transaction commits, remove orphaned files from storage
      // (only rows that actually had a storage-backed publicId).
      for (const removed of toDelete) {
        if (removed.publicId) {
          await imageStorage.remove(removed.publicId).catch(() => undefined);
        }
      }

      revalidatePath('/');
      revalidatePath('/admin');
      return { ok: true, data: { carId: existingId } };
    }

    // Create
    const dupe = await prisma.car.findUnique({ where: { carNumber: data.carNumber } });
    if (dupe) return { ok: false, error: 'A car with this RC number already exists.' };

    const created = await prisma.car.create({
      data: {
        ...payload,
        images: {
          create: imageUrls.map((imageUrl, i) => ({
            imageUrl,
            sortOrder: i,
            publicId: imagePublicIds[imageUrl] ?? null,
          })),
        },
      },
    });

    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true, data: { carId: created.id } };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[saveCarAction]', err);
    return { ok: false, error: 'Could not save the vehicle. Please try again.' };
  }
}

export async function deleteCarAction(carId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const car = await prisma.car.delete({
      where: { id: carId },
      include: { images: true },
    });
    // Best-effort storage cleanup for this car's uploaded photos.
    for (const img of car.images) {
      if (img.publicId) {
        await imageStorage.remove(img.publicId).catch(() => undefined);
      }
    }
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[deleteCarAction]', err);
    return { ok: false, error: 'Could not delete the vehicle. Please try again.' };
  }
}

export async function updateAvailabilityAction(
  carId: string,
  availability: 'Available' | 'Reserved' | 'Sold'
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.car.update({
      where: { id: carId },
      data: { status: fromAvailability(availability) },
    });
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[updateAvailabilityAction]', err);
    return { ok: false, error: 'Could not update availability.' };
  }
}

/* ==================================================================
   ADMIN — IMAGES
   ================================================================== */

export async function addImageAction(formData: FormData): Promise<ActionResult<{ imageId: string }>> {
  try {
    await requireAdmin();
    const parsed = imageActionSchema.safeParse({
      carId: formData.get('carId'),
      imageUrl: formData.get('imageUrl'),
      publicId: formData.get('publicId') || undefined,
    });
    if (!parsed.success) return { ok: false, error: 'Invalid image data.' };

    const count = await prisma.carImage.count({ where: { carId: parsed.data.carId } });
    if (count >= MAX_IMAGES_PER_CAR) {
      return { ok: false, error: `Maximum ${MAX_IMAGES_PER_CAR} images per car.` };
    }

    const maxOrder = await prisma.carImage.aggregate({
      where: { carId: parsed.data.carId },
      _max: { sortOrder: true },
    });

    const created = await prisma.carImage.create({
      data: {
        carId: parsed.data.carId,
        imageUrl: parsed.data.imageUrl,
        publicId: parsed.data.publicId ?? null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    revalidatePath('/');
    return { ok: true, data: { imageId: created.id } };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[addImageAction]', err);
    return { ok: false, error: 'Image upload failed.' };
  }
}

export async function deleteImageAction(imageId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const img = await prisma.carImage.findUnique({ where: { id: imageId } });
    if (img?.publicId) {
      await imageStorage.remove(img.publicId).catch(() => undefined);
    }
    await prisma.carImage.delete({ where: { id: imageId } });
    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[deleteImageAction]', err);
    return { ok: false, error: 'Could not delete image.' };
  }
}

export async function reorderImagesAction(
  carId: string,
  imageIds: string[]
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = reorderImagesSchema.safeParse({ carId, imageIds });
    if (!parsed.success) return { ok: false, error: 'Invalid reorder data.' };

    await prisma.$transaction(
      parsed.data.imageIds.map((id, i) =>
        prisma.carImage.update({ where: { id }, data: { sortOrder: i } })
      )
    );
    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[reorderImagesAction]', err);
    return { ok: false, error: 'Could not reorder images.' };
  }
}

export async function setPrimaryImageAction(carId: string, imageId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = setPrimaryImageSchema.safeParse({ carId, imageId });
    if (!parsed.success) return { ok: false, error: 'Invalid request.' };

    const images = await prisma.carImage.findMany({
      where: { carId: parsed.data.carId },
      orderBy: { sortOrder: 'asc' },
    });
    const target = images.find((i) => i.id === parsed.data.imageId);
    if (!target) return { ok: false, error: 'Image not found.' };

    const reordered = [target, ...images.filter((i) => i.id !== target.id)];
    await prisma.$transaction(
      reordered.map((img, i) =>
        prisma.carImage.update({ where: { id: img.id }, data: { sortOrder: i } })
      )
    );
    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[setPrimaryImageAction]', err);
    return { ok: false, error: 'Could not set primary image.' };
  }
}

/* ==================================================================
   PUBLIC — QUERIES (parameterized through Prisma; no raw SQL)
   ================================================================== */

export interface PublicCarFilter {
  brand?: string;
  ac?: 'all' | 'ac' | 'non-ac';
  minPrice?: number;
  maxPrice?: number;
  maxKm?: number;
  fuel?: string;
  transmission?: string;
  search?: string;
  sortBy?: 'price-low' | 'price-high' | 'km-low' | 'year-new' | 'featured';
}

export async function getCarsAction(filter?: PublicCarFilter): Promise<ActionResult<Car[]>> {
  try {
    const where: {
      brand?: { equals: string; mode?: 'insensitive' };
      acAvailable?: boolean;
      price?: { gte?: number; lte?: number };
      kmTo?: { lte?: number };
      fuelType?: string;
      transmission?: string;
      OR?: Array<Record<string, unknown>>;
    } = {};

    if (filter?.brand && filter.brand !== 'all') {
      where.brand = { equals: filter.brand, mode: 'insensitive' };
    }
    if (filter?.ac === 'ac') where.acAvailable = true;
    if (filter?.ac === 'non-ac') where.acAvailable = false;
    if (typeof filter?.minPrice === 'number' && filter.minPrice > 0) {
      where.price = { ...where.price, gte: filter.minPrice };
    }
    if (typeof filter?.maxPrice === 'number' && filter.maxPrice < 25_000_000) {
      where.price = { ...where.price, lte: filter.maxPrice };
    }
    if (typeof filter?.maxKm === 'number' && filter.maxKm < 200000) {
      where.kmTo = { lte: filter.maxKm };
    }
    if (filter?.fuel && filter.fuel !== 'all') where.fuelType = filter.fuel;
    if (filter?.transmission && filter.transmission !== 'all') {
      where.transmission = filter.transmission;
    }
    if (filter?.search?.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { carNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy: Array<Record<string, 'asc' | 'desc'>> = (() => {
      switch (filter?.sortBy) {
        case 'price-low':
          return [{ price: 'asc' }];
        case 'price-high':
          return [{ price: 'desc' }];
        case 'km-low':
          return [{ kmFrom: 'asc' }];
        case 'year-new':
          return [{ year: 'desc' }];
        default:
          return [{ createdAt: 'desc' }];
      }
    })();

    const cars = await prisma.car.findMany({ where, orderBy, include: { images: true } });
    const { mapCar } = await import('@/lib/mappers');
    return { ok: true, data: cars.map(mapCar) };
  } catch (err) {
    console.error('[getCarsAction]', err);
    return { ok: false, error: 'Could not load the showroom. Please refresh.' };
  }
}

export async function getCarByIdAction(carId: string): Promise<ActionResult<Car | null>> {
  try {
    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { images: true },
    });
    if (!car) return { ok: true, data: null };
    const { mapCar } = await import('@/lib/mappers');
    return { ok: true, data: mapCar(car) };
  } catch (err) {
    console.error('[getCarByIdAction]', err);
    return { ok: false, error: 'Could not load this vehicle.' };
  }
}

export async function getBrandsAction(): Promise<ActionResult<string[]>> {
  try {
    const rows = await prisma.car.findMany({
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return { ok: true, data: rows.map((r) => r.brand) };
  } catch (err) {
    console.error('[getBrandsAction]', err);
    return { ok: false, error: 'Could not load brands.' };
  }
}
