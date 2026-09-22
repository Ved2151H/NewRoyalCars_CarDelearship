import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { imageStorage, MAX_IMAGE_BYTES } from '@/lib/storage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export async function POST(req: NextRequest) {
  // Server-side auth — uploads are admin-only.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported format. Use JPEG, PNG, WebP or AVIF.' },
        { status: 415 }
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `Image too large. Maximum ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.` },
        { status: 413 }
      );
    }

    const stored = await imageStorage.put(file);
    return NextResponse.json({ ok: true, ...stored });
  } catch (err) {
    console.error('[uploadImages]', err);
    return NextResponse.json({ error: 'Image upload failed. Please try again.' }, { status: 500 });
  }
}
