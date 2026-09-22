import { ZodError } from 'zod';

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatKm(km: number): string {
  return km.toLocaleString('en-IN');
}

/** First human-readable error from a Zod result (works on zod v3 & v4). */
export function firstZodError(error: ZodError<unknown>): string {
  const issues = error.issues ?? [];
  return issues[0]?.message ?? 'Invalid input';
}

/** Field-level error map from a Zod result. */
export function zodFieldErrors(error: ZodError<unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues ?? []) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
