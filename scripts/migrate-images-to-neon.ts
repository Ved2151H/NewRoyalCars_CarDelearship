/**
 * One-time migration: move existing local-disk car images to Neon Object Storage.
 *
 * For every CarImage row whose imageUrl points at the old local disk storage
 * (`/uploads/<name>`):
 *   1. Reads the file from public/uploads/<name>
 *   2. Uploads it to the Neon Object Storage bucket under cars/<name>
 *   3. Updates the row's imageUrl + publicId
 *   4. Verifies the new URL is publicly reachable (HTTP 200)
 *   5. Only then deletes the local file (opt-in via --delete-local)
 *
 * Safety:
 *   - Idempotent: rows already pointing at the storage host are skipped.
 *   - Skips rows whose local file is missing (reported, not deleted).
 *   - DB row is only updated after a successful upload.
 *   - Local file is only deleted after URL verification succeeds.
 *
 * Usage:
 *   npx tsx scripts/migrate-images-to-neon.ts            # migrate, keep local files
 *   npx tsx scripts/migrate-images-to-neon.ts --delete-local
 */
import 'dotenv/config';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const DELETE_LOCAL = process.argv.includes('--delete-local');

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

const endpoint = requireEnv('AWS_ENDPOINT_URL_S3');
const bucket = process.env.NEON_STORAGE_BUCKET || 'assets';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  endpoint,
  credentials: {
    accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
  },
  forcePathStyle: true,
});

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function publicUrl(key: string): string {
  return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
}

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.carImage.findMany();

  const localRows = rows.filter((r) => r.imageUrl.startsWith('/uploads/'));
  console.log(`CarImage rows: ${rows.length}, local-disk rows: ${localRows.length}`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of localRows) {
    const name = path.basename(row.imageUrl); // prevent path traversal
    const localPath = path.join(process.cwd(), 'public', 'uploads', name);
    const ext = path.extname(name).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? 'image/jpeg';
    const key = `cars/migrated-${name}`;

    try {
      const body = await readFile(localPath);

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: mime,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      const url = publicUrl(key);

      // Verify the object is publicly reachable before touching the DB.
      const head = await fetch(url, { method: 'GET' });
      if (!head.ok) throw new Error(`verification failed: HTTP ${head.status}`);

      await prisma.carImage.update({
        where: { id: row.id },
        data: { imageUrl: url, publicId: key },
      });

      console.log(`✓ migrated ${row.imageUrl} → ${url}`);

      if (DELETE_LOCAL) {
        await unlink(localPath);
        console.log(`  ✓ local file removed: ${localPath}`);
      }
      migrated++;
    } catch (err) {
      failed++;
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        skipped++;
        console.warn(`⚠ local file missing, skipped: ${row.imageUrl}`);
      } else {
        console.error(`✗ failed for ${row.imageUrl}:`, (err as Error).message);
      }
    }
  }

  await prisma.$disconnect();
  console.log(`\nDone. migrated: ${migrated}, skipped(missing): ${skipped}, failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
