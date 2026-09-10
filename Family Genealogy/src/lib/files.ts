import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');

/** Resolve a stored relative path safely (no traversal outside UPLOAD_DIR). */
export function resolveUploadPath(relPath: string): string | null {
  const clean = relPath.replace(/^\/+/, '');
  const abs = path.resolve(UPLOAD_DIR, clean);
  if (!abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep) && abs !== path.resolve(UPLOAD_DIR)) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
};

export function contentTypeFor(relPath: string): string {
  const ext = path.extname(relPath).replace('.', '').toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

/**
 * Optimize an uploaded image: store a re-encoded original, a webp optimized
 * copy and a thumbnail. GPS/EXIF metadata is deliberately NOT copied — exact
 * coordinates must never be exposed to family members.
 */
export async function storeImage(buffer: Buffer): Promise<{
  filePath: string;
  optimizedPath: string;
  thumbPath: string;
  width: number | null;
  height: number | null;
}> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  for (const d of ['originals', 'optimized', 'thumbs']) {
    fs.mkdirSync(path.join(UPLOAD_DIR, d), { recursive: true });
  }

  const filePath = `originals/${id}.jpg`;
  const optimizedPath = `optimized/${id}.webp`;
  const thumbPath = `thumbs/${id}.webp`;

  const base = sharp(buffer);
  const meta = await base.metadata();

  await base.clone().rotate().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toFile(path.join(UPLOAD_DIR, filePath));
  await base.clone().rotate().resize(1400, 1400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(UPLOAD_DIR, optimizedPath));
  await base.clone().rotate().resize(400, 400, { fit: 'cover' }).webp({ quality: 72 }).toFile(path.join(UPLOAD_DIR, thumbPath));

  return { filePath, optimizedPath, thumbPath, width: meta.width ?? null, height: meta.height ?? null };
}