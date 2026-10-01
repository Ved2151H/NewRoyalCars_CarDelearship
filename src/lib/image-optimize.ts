/**
 * Client-side image optimization for car photo uploads.
 *
 * Photographs are decoded and re-encoded to WebP in the browser BEFORE any
 * network transfer, so the original multi-megabyte file never leaves the
 * device:
 *
 *   select file → decode (EXIF-oriented) → scale to ≤ MAX_DIMENSION
 *   → canvas draw (aspect ratio preserved) → toBlob(image/webp, 0.82)
 *
 * Design notes:
 * - createImageBitmap() applies EXIF orientation automatically
 *   (imageOrientation: 'from-image') and is available in every modern
 *   browser; a plain <img> fallback covers older Safari.
 * - The canvas is exactly the scaled size, so the aspect ratio can never
 *   stretch or distort.
 * - Small files that are already within budget (≤ SMALL_FILE_BYTES) pass
 *   through untouched — no pointless recompression of thumbnails.
 * - WebP is also accepted as an input and re-encoded at our quality level.
 */
export const MAX_DIMENSION = 1920;
export const WEBP_QUALITY = 0.82;
export const SMALL_FILE_BYTES = 150 * 1024; // already-tiny files pass through

export interface OptimizedImage {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('WebP encoding failed'))),
      'image/webp',
      quality
    );
  });
}

/**
 * Decode + resize + encode to WebP. Throws when the file cannot be decoded
 * (corrupt/unsupported) so the caller can surface a clear error and skip the
 * upload — a broken image must never reach storage.
 */
export async function optimizeImage(file: File): Promise<OptimizedImage> {
  if (typeof document === 'undefined') throw new Error('Compression needs a browser');

  // Pass-through for files that are already small enough: no quality loss.
  if (file.size <= SMALL_FILE_BYTES && file.type !== 'image/png') {
    const dims = await readDimensions(file);
    return { blob: file, width: dims.width, height: dims.height, bytes: file.size };
  }

  const bitmap = await decode(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable in this browser');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToWebp(canvas, WEBP_QUALITY);
    return { blob, width, height, bytes: blob.size };
  } finally {
    release(bitmap);
  }
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap with 'from-image' honors EXIF orientation.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Not a readable image'));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

async function readDimensions(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await decode(file);
  try {
    const width = 'width' in bitmap ? bitmap.width : 0;
    const height = 'height' in bitmap ? bitmap.height : 0;
    return { width, height };
  } finally {
    release(bitmap);
  }
}

/** ImageBitmap needs an explicit close; <img> is garbage-collected. */
function release(b: ImageBitmap | HTMLImageElement): void {
  if ('close' in b && typeof b.close === 'function') b.close();
}

/** Human-readable size, used in the upload error banner. */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** "IMG_4032.JPG" → "IMG_4032.webp" — keeps the original base name. */
export function toWebpName(name: string): string {
  return `${name.replace(/\.[^.]+$/, '')}.webp`;
}
