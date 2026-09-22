import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  imageStorage,
  sniffImageMime,
  ALLOWED_MIME_TYPES,
  MAX_IMAGE_BYTES,
  createPresignedUpload,
} from '@/lib/storage';

const UPLOAD_FIELDS = ['file'] as const;

/**
 * Step 1 of the production upload flow: mint a short-lived presigned PUT URL.
 * The browser then uploads the file DIRECTLY to Neon Object Storage — bytes
 * never traverse this serverless function, so Vercel's 4.5 MB request-body
 * limit is irrelevant. Admin-only; no write credentials reach the client.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = req.nextUrl.searchParams.get('contentType') ?? '';
    const contentLength = Number(req.nextUrl.searchParams.get('size') ?? 0);
    const fileExt = (req.nextUrl.searchParams.get('name') ?? '').split('.').pop() ?? '';

    if (
      !contentLength ||
      contentLength > MAX_IMAGE_BYTES ||
      !ALLOWED_MIME_TYPES.includes(contentType as (typeof ALLOWED_MIME_TYPES)[number])
    ) {
      return NextResponse.json(
        { error: contentLength > MAX_IMAGE_BYTES ? 'Image must be smaller than 10 MB.' : 'Only JPG, PNG and WebP images are supported.' },
        { status: contentLength > MAX_IMAGE_BYTES ? 413 : 415 }
      );
    }

    const grant = await createPresignedUpload(fileExt, contentType, contentLength);
    return NextResponse.json({ ok: true, ...grant });
  } catch (err) {
    console.error('[presignUpload]', err);
    return NextResponse.json(
      { error: 'Unable to prepare the upload. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Server-side auth — uploads are admin-only.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get(UPLOAD_FIELDS[0]);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // 1. Size first (cheap).
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Image must be smaller than 10 MB.' },
        { status: 413 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'The selected file is empty.' }, { status: 400 });
    }

    // 2. Declared MIME type.
    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json(
        { error: 'Only JPG, PNG and WebP images are supported.' },
        { status: 415 }
      );
    }

    // 3. Magic-byte check — never trust the browser's declared type.
    const sniffed = await sniffImageMime(file);
    if (!sniffed || !ALLOWED_MIME_TYPES.includes(sniffed as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json(
        { error: 'Only JPG, PNG and WebP images are supported.' },
        { status: 415 }
      );
    }

    const stored = await imageStorage.put(file);
    return NextResponse.json({ ok: true, ...stored });
  } catch (err) {
    console.error('[uploadImage]', err);
    return NextResponse.json(
      { error: 'Unable to upload the image. Please try again.' },
      { status: 500 }
    );
  }
}

/** Delete a previously uploaded image from storage (admin-only). */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const publicId = req.nextUrl.searchParams.get('publicId');
    if (!publicId) {
      return NextResponse.json({ error: 'publicId is required.' }, { status: 400 });
    }
    await imageStorage.remove(publicId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[deleteUploadedImage]', err);
    return NextResponse.json({ error: 'Unable to delete the image.' }, { status: 500 });
  }
}
