'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireSuperAdmin, hashPassword, verifyPassword, createSession, destroySession } from '@/lib/auth';
import { firstZodError, type ActionResult } from '@/lib/utils';
import { z } from 'zod';

/* ==================================================================
   VALIDATION
   ================================================================== */

const updateOwnAccountSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(120).optional(),
  currentPassword: z.string().min(1, 'Current password is required').optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128).optional(),
  confirmPassword: z.string().optional(),
});

const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(120),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  confirmPassword: z.string(),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN'),
});

const modifyAdminSchema = z.object({
  adminId: z.string().min(1),
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(120).optional(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(128).optional(),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).optional(),
});

/* ==================================================================
   MY ACCOUNT — the authenticated admin updates their own profile.
   Password change requires the current password; changing email or
   password rotates the session (JWT carries name + email).
   ================================================================== */

export async function updateOwnAccountAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = updateOwnAccountSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
    const { name, email, currentPassword, newPassword, confirmPassword } = parsed.data;

    if (!name && !email && !newPassword) {
      return { ok: false, error: 'Nothing to update.' };
    }

    const me = await prisma.admin.findUnique({ where: { id: session.adminId } });
    if (!me) return { ok: false, error: 'Account not found.' };

    // Any change requires re-authentication with the current password.
    if (!currentPassword || !verifyPassword(currentPassword, me.passwordHash)) {
      return { ok: false, error: 'Current password is incorrect.' };
    }

    if (email && email !== me.email) {
      const dupe = await prisma.admin.findUnique({ where: { email } });
      if (dupe) return { ok: false, error: 'This email is already in use by another admin account.' };
    }

    if (newPassword) {
      if (newPassword === currentPassword) {
        return { ok: false, error: 'New password must be different from the current password.' };
      }
      if (confirmPassword !== newPassword) {
        return { ok: false, error: 'New password and confirmation do not match.' };
      }
    }

    const data: { name?: string; email?: string; passwordHash?: string } = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (newPassword) data.passwordHash = hashPassword(newPassword);

    const updated = await prisma.admin.update({ where: { id: me.id }, data });

    // Rotate the session so name/email stay consistent; the session cookie is
    // re-issued with the same TTL class. Password change = full re-login flow
    // for other devices isn't trackable with stateless JWTs, but the stolen
    // old session still carries the OLD email — acceptable, it expires within
    // the TTL and this password is now the only valid credential.
    await createSession({
      adminId: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as 'SUPER_ADMIN' | 'ADMIN',
    });

    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[updateOwnAccountAction]', err);
    return { ok: false, error: 'Could not update your account. Please try again.' };
  }
}

/* ==================================================================
   ADMIN ACCOUNTS — SUPER_ADMIN only
   ================================================================== */

export async function listAdminsAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      name: string;
      email: string;
      role: 'SUPER_ADMIN' | 'ADMIN';
      createdAt: string;
    }>
  >
> {
  try {
    await requireSuperAdmin();
    const admins = await prisma.admin.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      ok: true,
      data: admins.map((a) => ({ ...a, role: a.role as 'SUPER_ADMIN' | 'ADMIN', createdAt: a.createdAt.toISOString() })),
    };
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message.includes('super admin'))) {
      return { ok: false, error: 'Super admin access required.' };
    }
    console.error('[listAdminsAction]', err);
    return { ok: false, error: 'Could not load admin accounts.' };
  }
}

export async function createAdminAction(input: unknown): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const parsed = createAdminSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
    const { name, email, password, confirmPassword, role } = parsed.data;

    if (password !== confirmPassword) {
      return { ok: false, error: 'Password and confirmation do not match.' };
    }

    const dupe = await prisma.admin.findUnique({ where: { email } });
    if (dupe) return { ok: false, error: 'An admin account with this email already exists.' };

    await prisma.admin.create({
      data: { name, email, passwordHash: hashPassword(password), role },
    });

    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message.includes('super admin'))) {
      return { ok: false, error: 'Super admin access required.' };
    }
    console.error('[createAdminAction]', err);
    return { ok: false, error: 'Could not create the admin account.' };
  }
}

export async function modifyAdminAction(input: unknown): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const parsed = modifyAdminSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
    const { adminId, name, email, newPassword, role } = parsed.data;

    const target = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!target) return { ok: false, error: 'Admin account not found.' };

    // Last-super-admin guard: never allow demoting the only SUPER_ADMIN.
    const superAdminCount = await prisma.admin.count({ where: { role: 'SUPER_ADMIN' } });
    const wouldLoseLastSuper =
      target.role === 'SUPER_ADMIN' &&
      role === 'ADMIN' &&
      superAdminCount <= 1;
    if (wouldLoseLastSuper) {
      return { ok: false, error: 'Cannot demote the last remaining SUPER_ADMIN account.' };
    }

    if (email && email !== target.email) {
      const dupe = await prisma.admin.findUnique({ where: { email } });
      if (dupe) return { ok: false, error: 'This email is already in use by another admin account.' };
    }

    const data: { name?: string; email?: string; role?: 'ADMIN' | 'SUPER_ADMIN'; passwordHash?: string } = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role) data.role = role;
    if (newPassword) data.passwordHash = hashPassword(newPassword);

    await prisma.admin.update({ where: { id: adminId }, data });
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message.includes('super admin'))) {
      return { ok: false, error: 'Super admin access required.' };
    }
    console.error('[modifyAdminAction]', err);
    return { ok: false, error: 'Could not update the admin account.' };
  }
}

export async function deleteAdminAction(adminId: string): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();

    if (adminId === session.adminId) {
      return { ok: false, error: 'You cannot delete your own account while signed in.' };
    }

    const target = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!target) return { ok: false, error: 'Admin account not found.' };

    // SUPER_ADMIN accounts are undeletable — the dealership must always retain
    // its owner-level accounts. Demotion (modifyAdminAction) is the only way
    // to change a super admin's role, and even that preserves at least one.
    if (target.role === 'SUPER_ADMIN') {
      return { ok: false, error: 'SUPER_ADMIN accounts cannot be deleted. Demote the account to ADMIN first if it must be removed.' };
    }

    await prisma.admin.delete({ where: { id: adminId } });
    revalidatePath('/admin');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message.includes('super admin'))) {
      return { ok: false, error: 'Super admin access required.' };
    }
    console.error('[deleteAdminAction]', err);
    return { ok: false, error: 'Could not delete the admin account.' };
  }
}

/** Used by the client after profile updates to refresh session-derived UI. */
export async function getMyAccountAction(): Promise<
  ActionResult<{ id: string; name: string; email: string; role: 'SUPER_ADMIN' | 'ADMIN'; createdAt: string }>
> {
  try {
    const session = await requireAdmin();
    const me = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!me) return { ok: false, error: 'Account not found.' };
    return {
      ok: true,
      data: { ...me, role: me.role as 'SUPER_ADMIN' | 'ADMIN', createdAt: me.createdAt.toISOString() },
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return { ok: false, error: 'Your session expired. Please sign in again.' };
    }
    console.error('[getMyAccountAction]', err);
    return { ok: false, error: 'Could not load your account.' };
  }
}
