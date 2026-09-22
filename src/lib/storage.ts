import 'server-only';

/**
 * Image storage abstraction.
 *
 * Today: uploads are normalized to data URLs (safe for Postgres — small,
 * compressed client-side before upload) so the app works with zero external
 * services. The provider seam below is where S3/Cloudinary/UploadThing plugs
 * in via IMAGE_STORAGE_* env vars without touching any UI or action code.
 */
export interface StoredImage {
  imageUrl: string;
  publicId: string | null;
}

export interface ImageStorageProvider {
  put(file: File): Promise<StoredImage>;
  remove(publicId: string): Promise<void>;
}

function isExternalProviderConfigured(): boolean {
  return Boolean(
    process.env.IMAGE_STORAGE_URL && process.env.IMAGE_STORAGE_KEY && process.env.IMAGE_STORAGE_SECRET
  );
}

/**
 * Default provider — stores data URLs. Kept intentionally small; actual
 * size/quality compression happens on the client before upload.
 */
const dataUrlProvider: ImageStorageProvider = {
  async put(file: File): Promise<StoredImage> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || 'image/jpeg';
    const publicId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return {
      imageUrl: `data:${mime};base64,${buffer.toString('base64')}`,
      publicId,
    };
  },
  async remove(): Promise<void> {
    /* data URLs need no cleanup */
  },
};

/**
 * Placeholder external provider — wired for env-based config. Replace the
 * bodies with real SDK calls when a provider is chosen (Cloudinary, S3, …).
 */
const externalProvider: ImageStorageProvider = {
  async put(): Promise<StoredImage> {
    throw new Error('External image storage not configured yet — set provider SDK in lib/storage.ts');
  },
  async remove(): Promise<void> {
    /* provider SDK call goes here */
  },
};

export const imageStorage: ImageStorageProvider = isExternalProviderConfigured()
  ? externalProvider
  : dataUrlProvider;

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB per image, enforced server-side
export const MAX_IMAGES_PER_CAR = 12;
