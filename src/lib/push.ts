import 'server-only';
import { importPKCS8, SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';

/* ==================================================================
   FCM (Firebase Cloud Messaging) — server-side sender
   ==================================================================

   Delivers a real Android notification to every registered ADMIN device when
   a new enquiry is stored. Design rules:

     • Reuses the existing backend: same Next.js app, same Prisma client, same
       database, same admin session. No second backend, no second auth system.
     • Server credentials never leave the server. The service-account private
       key is read from the environment and is signed with `jose`, which the
       project already depends on — so no new runtime dependency is added.
     • This module NEVER throws. A push failure must not affect the enquiry
       that was already saved successfully.
   ================================================================== */

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const ANDROID_CHANNEL_ID = 'nrc_enquiries';

export const DEFAULT_ENQUIRY_DEEP_LINK = '/admin/enquiries';

export interface EnquiryPushPayload {
  enquiryId: string;
  customerName: string;
  phone: string;
  /** Vehicle the enquiry is about; null/empty for a general enquiry. */
  carName: string | null;
}

interface FirebaseServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/** Cached OAuth2 access token (valid ~1h). */
let cachedAccessToken: { value: string; expiresAt: number } | null = null;

/* ------------------------- credentials ------------------------- */

function normalisePrivateKey(key: string): string {
  // Env vars often carry literal "\n" sequences; PEM parsing needs real newlines.
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

/**
 * Resolves the Firebase service account from the environment.
 *
 * Supported:
 *   FIREBASE_SERVICE_ACCOUNT   full service-account JSON, raw or base64
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *
 * Server-side only. Nothing here is ever sent to a client.
 */
export function readServiceAccount(): FirebaseServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (raw) {
    try {
      const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      const parsed = JSON.parse(json) as Record<string, string>;
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: normalisePrivateKey(parsed.private_key),
        };
      }
    } catch (err) {
      console.error('[push] FIREBASE_SERVICE_ACCOUNT could not be parsed:', err);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey: normalisePrivateKey(privateKey) };
  }

  return null;
}

export function isPushConfigured(): boolean {
  return readServiceAccount() !== null;
}

/* ------------------------- OAuth2 ------------------------- */

async function getAccessToken(account: FirebaseServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60 > now) {
    return cachedAccessToken.value;
  }

  const signingKey = await importPKCS8(account.privateKey, 'RS256');
  const assertion = await new SignJWT({ scope: FCM_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(account.clientEmail)
    .setAudience(GOOGLE_TOKEN_ENDPOINT)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(signingKey);

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token request failed (${response.status}): ${await response.text()}`);
  }

  const json = (await response.json()) as { access_token: string; expires_in?: number };
  cachedAccessToken = {
    value: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600),
  };
  return cachedAccessToken.value;
}

/* ------------------------- token storage ------------------------- */

export interface RegisterPushTokenInput {
  token: string;
  platform?: string;
  adminId: string;
  email: string;
}

/**
 * Removes one device token (client-side logout, or a refreshed token).
 * Exact-match delete: an unauthenticated caller who somehow knows a token can
 * only ever remove that one row — nothing else is readable or writable.
 */
export async function removePushToken(token: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { token } });
}

/** Upserts one device token. Only ever called from an authenticated admin request. */
export async function savePushToken(input: RegisterPushTokenInput): Promise<void> {
  await prisma.pushToken.upsert({
    where: { token: input.token },
    create: {
      token: input.token,
      platform: input.platform ?? 'android',
      adminId: input.adminId,
      email: input.email,
    },
    update: {
      platform: input.platform ?? 'android',
      adminId: input.adminId,
      email: input.email,
    },
  });
}

/* ------------------------- notification text ------------------------- */

/** Exact copy requested for a new-enquiry alert. */
export function buildEnquiryNotification(payload: EnquiryPushPayload): { title: string; body: string } {
  const car = payload.carName?.trim();
  const lines = [
    car ? `Someone has submitted a new enquiry for:\n${car}` : 'Someone has submitted a new enquiry.',
    `Customer:\n${payload.customerName}`,
    `Phone:\n${payload.phone}`,
    'Open New Royal Cars to view the enquiry.',
  ];
  return { title: 'New Car Enquiry', body: lines.join('\n\n') };
}

/* ------------------------- send ------------------------- */

type DeliveryResult = 'sent' | 'unregistered' | 'failed';

async function sendToToken(
  account: FirebaseServiceAccount,
  accessToken: string,
  token: string,
  title: string,
  body: string,
  payload: EnquiryPushPayload
): Promise<DeliveryResult> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: {
            type: 'new_enquiry',
            enquiryId: payload.enquiryId,
            deepLink: DEFAULT_ENQUIRY_DEEP_LINK,
            title,
            body,
          },
          android: {
            priority: 'HIGH',
            notification: {
              channel_id: ANDROID_CHANNEL_ID,
              sound: 'default',
              default_vibrate_timings: true,
            },
          },
        },
      }),
    }
  );

  if (response.ok) return 'sent';

  const text = await response.text();
  // A token that no longer exists (uninstalled / cleared data) should be pruned.
  if (response.status === 404 || text.includes('UNREGISTERED') || text.includes('NOT_FOUND')) {
    return 'unregistered';
  }
  console.error(`[push] FCM send failed (${response.status}): ${text}`);
  return 'failed';
}

/**
 * Notifies every registered admin device about a newly stored enquiry.
 *
 * Runs strictly AFTER the enquiry has been committed, and swallows every error
 * — notification delivery can never roll back or break an enquiry.
 */
export async function notifyAdminsOfNewEnquiry(payload: EnquiryPushPayload): Promise<void> {
  try {
    const account = readServiceAccount();
    if (!account) {
      console.info('[push] Firebase service account not configured — skipping enquiry notification.');
      return;
    }

    const devices = await prisma.pushToken.findMany({ select: { token: true } });
    if (devices.length === 0) {
      console.info('[push] No admin devices registered — nothing to notify.');
      return;
    }

    const accessToken = await getAccessToken(account);
    const { title, body } = buildEnquiryNotification(payload);

    const results = await Promise.allSettled(
      devices.map((device) => sendToToken(account, accessToken, device.token, title, body, payload))
    );

    const stale: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value === 'unregistered') {
        stale.push(devices[index].token);
      }
    });

    if (stale.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: stale } } });
      console.info(`[push] Removed ${stale.length} stale device token(s).`);
    }
  } catch (err) {
    // Never propagate: the enquiry is already saved and must stay saved.
    console.error('[push] Enquiry notification dispatch failed:', err);
  }
}
