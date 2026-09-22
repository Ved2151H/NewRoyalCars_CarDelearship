'use server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import type { ActionResult } from '@/lib/utils';

export interface DashboardStats {
  totalCars: number;
  available: number;
  soldOrUnavailable: number;
  acCars: number;
  nonAcCars: number;
  totalEnquiries: number;
}

export async function getDashboardStatsAction(): Promise<ActionResult<DashboardStats>> {
  try {
    await requireAdmin();

    const [totalCars, available, sold, unavailable, acCars, totalEnquiries] = await Promise.all([
      prisma.car.count(),
      prisma.car.count({ where: { status: 'AVAILABLE' } }),
      prisma.car.count({ where: { status: 'SOLD' } }),
      prisma.car.count({ where: { status: 'UNAVAILABLE' } }),
      prisma.car.count({ where: { acAvailable: true } }),
      prisma.enquiry.count(),
    ]);

    return {
      ok: true,
      data: {
        totalCars,
        available,
        soldOrUnavailable: sold + unavailable,
        acCars,
        nonAcCars: totalCars - acCars,
        totalEnquiries,
      },
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[getDashboardStatsAction]', err);
    return { ok: false, error: 'Could not load dashboard statistics.' };
  }
}
