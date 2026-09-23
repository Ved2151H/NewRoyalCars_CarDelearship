'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { firstZodError, type ActionResult } from '@/lib/utils';

/**
 * Dealership configuration — the single source of truth for contact details.
 * Managed in Admin → Settings, consumed by the public Contact page.
 */

export interface DealerSettingsData {
  dealershipName: string;
  contactPhone: string;
  supportEmail: string;
  showroomAddress: string;
  businessHours: string;
  whatsappNumber: string;
  mapsUrl: string;
  enableInstantSms: boolean;
  enableEmailAlerts: boolean;
}

const settingsSchema = z.object({
  dealershipName: z.string().trim().min(1, 'Dealership name is required.').max(120),
  contactPhone: z.string().trim().min(7, 'Enter a valid phone number.').max(20),
  supportEmail: z.string().trim().email('Enter a valid email address.').max(160),
  showroomAddress: z.string().trim().min(1, 'Address is required.').max(400),
  businessHours: z.string().trim().max(200).optional().default(''),
  whatsappNumber: z.string().trim().max(20).optional().default(''),
  mapsUrl: z
    .string()
    .trim()
    .max(600)
    .refine((v) => v === '' || /^https?:\/\//.test(v), 'Maps link must start with http(s)://.')
    .optional()
    .default(''),
  enableInstantSms: z.boolean(),
  enableEmailAlerts: z.boolean(),
});

/** Public — safe fields only, used by the Contact page. */
export async function getDealerSettingsAction(): Promise<
  ActionResult<DealerSettingsData>
> {
  try {
    const row = await prisma.dealerSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!row) {
      return {
        ok: true,
        data: {
          dealershipName: 'NEW ROYAL CARS',
          contactPhone: '',
          supportEmail: 'concierge@newroyalcars.com',
          showroomAddress: 'Plot 42, Royal Pavilion Blvd, Worli Sea Face, Mumbai 400018',
          businessHours: 'Mon – Sun: 10:00 AM – 8:30 PM',
          whatsappNumber: '',
          mapsUrl: '',
          enableInstantSms: true,
          enableEmailAlerts: true,
        },
      };
    }
    return {
      ok: true,
      data: {
        dealershipName: row.dealershipName,
        contactPhone: row.contactPhone,
        supportEmail: row.supportEmail,
        showroomAddress: row.showroomAddress,
        businessHours: row.businessHours ?? '',
        whatsappNumber: row.whatsappNumber ?? '',
        mapsUrl: row.mapsUrl ?? '',
        enableInstantSms: row.enableInstantSms,
        enableEmailAlerts: row.enableEmailAlerts,
      },
    };
  } catch (err) {
    console.error('[getDealerSettingsAction]', err);
    return { ok: false, error: 'Could not load dealership settings.' };
  }
}

/** Admin-only save. Revalidates the public pages so Contact updates instantly. */
export async function saveDealerSettingsAction(
  data: unknown
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = settingsSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: firstZodError(parsed.error) };
    }
    const d = parsed.data;

    const existing = await prisma.dealerSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    const payload = {
      dealershipName: d.dealershipName,
      contactPhone: d.contactPhone,
      supportEmail: d.supportEmail,
      showroomAddress: d.showroomAddress,
      businessHours: d.businessHours || null,
      whatsappNumber: d.whatsappNumber || null,
      mapsUrl: d.mapsUrl || null,
      enableInstantSms: d.enableInstantSms,
      enableEmailAlerts: d.enableEmailAlerts,
    };

    if (existing) {
      await prisma.dealerSettings.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.dealerSettings.create({ data: payload });
    }

    // Cache invalidation: the Contact page (and everything public) re-renders
    // with the fresh values on the next request.
    revalidatePath('/', 'layout');

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[saveDealerSettingsAction]', err);
    return { ok: false, error: 'Could not save dealership settings. Please try again.' };
  }
}
