// Fills reunion albums with sample group-photo images when they have fewer
// than MIN_PER_ALBUM approved photos. Safe to re-run: existing photos are kept,
// and the script tops albums up to the target. Useful after the seed, or when
// new empty albums are created.
//
// Usage: node prisma/fill-reunion-photos.mjs
// (run inside the app container: docker compose exec app node prisma/fill-reunion-photos.mjs)
import { PrismaClient, PhotoStatus } from '@prisma/client';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { groupPhotoSvg } from './sample-images.mjs';

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
const MIN_PER_ALBUM = 3;
const TARGET_PER_ALBUM = 5;

async function saveImage(svg) {
  const id = randomUUID();
  const dirs = {
    originals: path.join(UPLOAD_DIR, 'originals'),
    optimized: path.join(UPLOAD_DIR, 'optimized'),
    thumbs: path.join(UPLOAD_DIR, 'thumbs'),
  };
  Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));

  const originalPath = `originals/${id}.jpg`;
  const optimizedPath = `optimized/${id}.webp`;
  const thumbPath = `thumbs/${id}.webp`;

  const base = sharp(Buffer.from(svg), { density: 144 });
  const meta = await base.clone().jpeg({ quality: 88 }).toFile(path.join(UPLOAD_DIR, originalPath));
  await base.clone().resize(1200, null, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(UPLOAD_DIR, optimizedPath));
  await base.clone().resize(360, 360, { fit: 'cover' }).webp({ quality: 72 }).toFile(path.join(UPLOAD_DIR, thumbPath));

  return { filePath: originalPath, optimizedPath, thumbPath, width: meta.width, height: meta.height };
}

async function main() {
  const [albums, admin] = await Promise.all([
    prisma.reunionAlbum.findMany({ include: { reunionEvent: { select: { name: true, date: true } } } }),
    prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, familyMemberId: true } }),
  ]);

  const counts = await prisma.albumPhoto.groupBy({ by: ['albumId'], _count: { photoId: true } });
  const countByAlbum = new Map(counts.map((c) => [c.albumId, c._count.photoId]));

  let created = 0;
  let skipped = 0;
  let toppedUp = 0;

  for (const album of albums) {
    const existing = countByAlbum.get(album.id) || 0;
    const year = album.reunionEvent.date.getFullYear();
    const need = Math.min(TARGET_PER_ALBUM, Math.max(0, MIN_PER_ALBUM - existing));

    if (need === 0) {
      skipped++;
      continue;
    }

    // Keep the album's existing photo count in mind: fill up to the target.
    const toAdd = Math.max(0, TARGET_PER_ALBUM - existing);
    for (let i = 0; i < toAdd; i++) {
      const img = await saveImage(
        groupPhotoSvg({ title: album.name, sub: `${album.reunionEvent.name} · photo ${existing + i + 1}` }),
      );
      const photo = await prisma.photo.create({
        data: {
          ...img,
          caption: `${album.name} — ${album.reunionEvent.name}`,
          photoDate: album.reunionEvent.date,
          location: album.reunionEvent.location || null,
          approvalStatus: PhotoStatus.APPROVED,
          uploadedById: admin?.familyMemberId || null,
        },
      });
      await prisma.albumPhoto.create({
        data: { albumId: album.id, photoId: photo.id, addedById: admin?.id || null },
      });
      created++;
    }
    toppedUp++;
    console.log(`+ ${toAdd} photo(s) → "${album.name}" (${year})`);
  }

  console.log(`\nDone: ${created} photos created, ${toppedUp} albums topped up, ${skipped} albums already filled.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});