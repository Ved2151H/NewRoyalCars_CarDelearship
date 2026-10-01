/**
 * Parallel, progress-tracked uploads to presigned storage URLs.
 *
 * - Concurrency-limited (3 simultaneous PUTs) so neither the browser nor the
 *   storage endpoint is overwhelmed; the rest queue in order.
 * - One XHR per photo, each reporting byte-level upload progress.
 * - Progress UI contract (unchanged): the same percentage bar and the same
 *   "N / M photos uploaded" counter as before. The bar is now byte-weighted
 *   across the whole batch — a smoother and more accurate signal than the
 *   old per-photo increments — while the counter increments per finished
 *   photo, exactly as it did.
 * - One automatic retry per photo on failure (with a fresh presigned URL,
 *   since grants expire); a photo that fails twice rejects with its filename
 *   so the admin can retry just that photo without re-uploading the ones
 *   that succeeded.
 * - Progress accounting is per-item: a retry resets that item's byte counter
 *   instead of double-counting, so the bar can never exceed 100%.
 */

export interface QueueItem {
  file: Blob;
  fileName: string;
}

export interface QueueResult {
  url: string;
  publicId: string;
}

export interface PresignGrant {
  uploadUrl: string;
  headers: Record<string, string>;
  publicUrl: string;
  publicId: string;
}

export interface QueueEvents {
  /** Bytes of the whole batch uploaded so far (compressed bytes). */
  onProgress: (done: number, total: number) => void;
  /** Called once per photo that finishes successfully. */
  onOneDone: () => void;
}

export const CONCURRENCY = 3;
const PUT_TIMEOUT_MS = 120_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Single PUT with byte-level progress. Resolves when storage accepts it. */
function putFile(
  blob: Blob,
  grant: PresignGrant,
  onChunk: (bytes: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', grant.uploadUrl);
    for (const [k, v] of Object.entries(grant.headers)) xhr.setRequestHeader(k, v);
    xhr.timeout = PUT_TIMEOUT_MS;

    let last = 0;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onChunk(e.loaded - last);
        last = e.loaded;
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage responded ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));

    xhr.send(blob);
  });
}

/** Per-item byte counter so retries don't double-count progress. */
interface ItemState {
  uploaded: number;
}

/**
 * Upload all items with a concurrency limit. `presign` mints each item's
 * grant (cheap JSON), then the bytes PUT directly to storage. Rejects with
 * an Error whose message names the failed file, after all in-flight uploads
 * have settled.
 */
export async function uploadAll(
  items: QueueItem[],
  presign: (item: QueueItem) => Promise<PresignGrant>,
  events: QueueEvents
): Promise<QueueResult[]> {
  const sizes = items.map((i) => Math.max(1, i.file.size));
  const total = sizes.reduce((s, n) => s + n, 0);
  const state: ItemState[] = items.map(() => ({ uploaded: 0 }));

  const recompute = () => {
    const done = state.reduce((s, st) => s + st.uploaded, 0);
    events.onProgress(done, total);
  };

  let next = 0;
  let finished = 0;
  const results: QueueResult[] = new Array(items.length);
  const failure: { fileName: string; message: string } | null = null;

  const worker = async () => {
    while (next < items.length) {
      const idx = next++;
      const item = items[idx];

      let grant = await presign(item);
      try {
        state[idx].uploaded = 0;
        await putFile(item.file, grant, (bytes) => {
          state[idx].uploaded += bytes;
          recompute();
        });
      } catch {
        // One automatic retry with a fresh presigned URL; reset this item's
        // counter so overall progress stays truthful.
        await sleep(800);
        state[idx].uploaded = 0;
        grant = await presign(item);
        await putFile(item.file, grant, (bytes) => {
          state[idx].uploaded += bytes;
          recompute();
        });
      }

      results[idx] = { url: grant.publicUrl, publicId: grant.publicId };
      finished++;
      events.onOneDone();
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    throw new Error(`"${items.find((_, i) => !results[i])?.fileName ?? 'photo'}" failed to upload (${message}).`);
  }
  void failure;

  return results;
}
