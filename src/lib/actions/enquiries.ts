'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { enquiryInputSchema, enquiryStatusUpdateSchema, enquiryDeleteSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { firstZodError, type ActionResult } from '@/lib/utils';
import type { Enquiry } from '@/types';

/* ==================================================================
   PUBLIC — SUBMIT ENQUIRY
   ================================================================== */

export async function submitEnquiryAction(
  input: unknown
): Promise<ActionResult<{ referenceId: string }>> {
  try {
    const parsed = enquiryInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: firstZodError(parsed.error) };
    }
    const data = parsed.data;

    // Rate limit per IP: 5 enquiries / 10 minutes.
    const hdrs = await headers();
    const ip =
      hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      hdrs.get('x-real-ip') ||
      'unknown';
    const rl = rateLimit(`enquiry:${ip}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return {
        ok: false,
        error: `Too many enquiries from this network. Try again in ${rl.retryAfterSec}s.`,
      };
    }

    // If car-scoped, validate the car exists.
    let carId: string | null = null;
    if (data.carId && data.carId !== 'general') {
      const car = await prisma.car.findUnique({ where: { id: data.carId }, select: { id: true } });
      if (!car) return { ok: false, error: 'This vehicle is no longer listed. Please browse the showroom again.' };
      carId = car.id;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Avoid duplicate customers by phone.
      const customer = await tx.customer.upsert({
        where: { phone: data.phone },
        create: { name: data.customerName, phone: data.phone, email: data.email || null },
        update: { name: data.customerName, email: data.email || undefined },
      });

      const enquiry = await tx.enquiry.create({
        data: {
          carId,
          customerId: customer.id,
          customerName: data.customerName,
          phone: data.phone,
          city: data.city || null,
          email: data.email || null,
          acRequired: data.acRequired,
          message: data.message || null,
          preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
          status: 'NEW',
        },
      });

      return enquiry;
    });

    revalidatePath('/admin');

    const referenceId = `NRC-${result.id.slice(-6).toUpperCase()}`;
    return { ok: true, data: { referenceId } };
  } catch (err) {
    console.error('[submitEnquiryAction]', err);
    return { ok: false, error: 'Your enquiry could not be sent. Please try again or call us directly.' };
  }
}

/* ==================================================================
   ADMIN — ENQUIRY MANAGEMENT
   ================================================================== */

export async function getEnquiriesAction(): Promise<ActionResult<Enquiry[]>> {
  try {
    await requireAdmin();
    const rows = await prisma.enquiry.findMany({
      include: { car: true },
      orderBy: { createdAt: 'desc' },
    });
    const { mapEnquiry } = await import('@/lib/mappers');
    return { ok: true, data: rows.map(mapEnquiry) };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[getEnquiriesAction]', err);
    return { ok: false, error: 'Could not load enquiries.' };
  }
}

export async function updateEnquiryStatusAction(
  enquiryId: string,
  status: 'NEW' | 'CONTACTED' | 'BOOKED' | 'CLOSED' | 'REJECTED'
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = enquiryStatusUpdateSchema.safeParse({ enquiryId, status });
    if (!parsed.success) return { ok: false, error: 'Invalid status update.' };

    await prisma.enquiry.update({
      where: { id: parsed.data.enquiryId },
      data: { status: parsed.data.status },
    });
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[updateEnquiryStatusAction]', err);
    return { ok: false, error: 'Could not update the enquiry status.' };
  }
}

export async function deleteEnquiryAction(enquiryId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = enquiryDeleteSchema.safeParse({ enquiryId });
    if (!parsed.success) return { ok: false, error: 'Invalid request.' };

    await prisma.enquiry.delete({ where: { id: parsed.data.enquiryId } });
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[deleteEnquiryAction]', err);
    return { ok: false, error: 'Could not delete the enquiry.' };
  }
}
