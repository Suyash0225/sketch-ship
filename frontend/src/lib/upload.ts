/**
 * Client-side upload prep: downscale heavy images before they ever hit the
 * wire, and run the queue at a bounded concurrency.
 *
 * Why downscale in the browser: the backend reads the whole upload into
 * memory to hash it, and Gemini only ever sees a fingerprint-sized image
 * anyway — shipping a 12 MB phone photo wastes the demo's slowest resource
 * (the network) for zero gain in match quality.
 */

/** Longest edge kept after downscaling. Plenty for vision comparison. */
const MAX_EDGE = 2048;
/** Files under this sail through untouched — re-encoding tiny PNGs is a loss. */
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface PreparedFile {
  file: File;
  originalBytes: number;
  /** True when the canvas pass actually produced a smaller file. */
  compressed: boolean;
  width: number;
  height: number;
}

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Not a readable image"));
    };
    img.src = url;
  });
}

/**
 * Returns a possibly-shrunken copy of `file`. Never throws: anything the
 * canvas can't handle (SVG, exotic codecs, tainted canvas) falls back to the
 * original file so the upload still goes through.
 */
export async function prepareImage(file: File): Promise<PreparedFile> {
  const original = { file, originalBytes: file.size, compressed: false, width: 0, height: 0 };

  try {
    const img = await loadBitmap(file);
    const { naturalWidth: w, naturalHeight: h } = img;
    original.width = w;
    original.height = h;

    const needsResize = Math.max(w, h) > MAX_EDGE;
    if (!needsResize && file.size < SKIP_BELOW_BYTES) return original;

    const scale = needsResize ? MAX_EDGE / Math.max(w, h) : 1;
    const targetW = Math.round(w * scale);
    const targetH = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    // Keep the original if the "optimised" version somehow came out bigger.
    if (!blob || blob.size >= file.size) return original;

    const renamed = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return {
      file: new File([blob], renamed, { type: "image/jpeg" }),
      originalBytes: file.size,
      compressed: true,
      width: targetW,
      height: targetH,
    };
  } catch {
    return original;
  }
}

/**
 * Runs `worker` over `items` with at most `concurrency` in flight.
 * Resolves once every item has settled; individual failures are the
 * worker's problem to report, not this helper's.
 */
export async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}
