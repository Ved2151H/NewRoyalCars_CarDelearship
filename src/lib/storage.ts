import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';

/**
 * Image storage abstraction.
 *
 * Two providers, selected automatically:
 *
 * 1. Cloudinary  — used when CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY +
 *    CLOUDINARY_API_SECRET are set (recommended for production / Vercel).
 *    Uses the signed REST API directly — no extra SDK dependency.
 *
 * 2. Local disk  — default for development. Writes files under public/uploads
 *    and serves them at /uploads/<name>. The database only ever stores the URL
 *    reference and a publicId — never image bytes.
 *
 * Both providers return the same shape, so the upload route, server actions
 * and UI need no changes when the provider switches.
 */
export interface StoredImage {
  imageUrl: string;
  publicId: string;
}

export interface ImageStorageProvider {
  put(file: File): Promise<StoredImage>;
  remove(publicId: string): Promise<void>;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB per image
export const MAX_IMAGES_PER_CAR = 10;

/** Bytes accepted by the image endpoints (validated again by magic bytes). */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/* ------------------------------------------------------------------ */
/* Magic-byte sniffing — never trust the browser's declared MIME type  */
/* ------------------------------------------------------------------ */

export async function sniffImageMime(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const bytes = (start: number, len: number) =>
    String.fromCharCode(...head.slice(start, start + len));

  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  ) {
    return 'image/png';
  }
  // WebP: RIFF .... WEBP
  if (bytes(0, 4) === 'RIFF' && bytes(8, 4) === 'WEBP') return 'image/webp';

  return null;
}

/* ------------------------------------------------------------------ */
/* Cloudinary (signed REST upload, no SDK)                             */
/* ------------------------------------------------------------------ */

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

const cloudinaryProvider: ImageStorageProvider = {
  async put(file: File): Promise<StoredImage> {
    const cfg = cloudinaryConfig();
    if (!cfg) throw new Error('Cloudinary is not configured');

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = 'new-royal-cars';
    // Params must be sorted alphabetically for a valid Cloudinary signature.
    const toSign = `folder=${folder}&timestamp=${timestamp}${cfg.apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    const form = new FormData();
    form.set('file', file);
    form.set('api_key', cfg.apiKey);
    form.set('timestamp', timestamp);
    form.set('folder', folder);
    form.set('signature', signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
      { method: 'POST', body: form }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[storage:cloudinary] upload failed', res.status, detail.slice(0, 300));
      throw new Error('Image storage rejected the upload');
    }
    const json = (await res.json()) as { secure_url?: string; public_id?: string };
    if (!json.secure_url || !json.public_id) {
      throw new Error('Image storage returned an invalid response');
    }
    return { imageUrl: json.secure_url, publicId: json.public_id };
  },

  async remove(publicId: string): Promise<void> {
    const cfg = cloudinaryConfig();
    if (!cfg) return;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const toSign = `public_id=${publicId}&timestamp=${timestamp}${cfg.apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');

    const form = new FormData();
    form.set('api_key', cfg.apiKey);
    form.set('timestamp', timestamp);
    form.set('public_id', publicId);
    form.set('signature', signature);

    await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/destroy`, {
      method: 'POST',
      body: form,
    }).catch(() => undefined);
  },
};

/* ------------------------------------------------------------------ */
/* Local disk (development default)                                    */
/* ------------------------------------------------------------------ */

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function uploadsDir(): string {
  return path.join(process.cwd(), 'public', 'uploads');
}

const localDiskProvider: ImageStorageProvider = {
  async put(file: File): Promise<StoredImage> {
    const mime = await sniffImageMime(file);
    const ext = EXT_BY_MIME[mime ?? ''] ?? '.jpg';
    const name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    const dir = uploadsDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return { imageUrl: `/uploads/${name}`, publicId: name };
  },

  async remove(publicId: string): Promise<void> {
    // Only delete plain filenames inside the uploads dir — no path traversal.
    if (!/^[\w.-]+$/.test(publicId)) return;
    await unlink(path.join(uploadsDir(), publicId)).catch(() => undefined);
  },
};

export const imageStorage: ImageStorageProvider = cloudinaryConfig()
  ? cloudinaryProvider
  : localDiskProvider;

export const storageProviderName = cloudinaryConfig() ? 'cloudinary' : 'local-disk';
