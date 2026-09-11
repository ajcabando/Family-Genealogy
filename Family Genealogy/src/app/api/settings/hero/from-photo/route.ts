import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { setSetting } from '@/lib/settings';
import { audit } from '@/lib/audit';

const VALID_HERO_KEYS = ['heroBackground', 'photosHeroBackground', 'treeHeroBackground', 'sidebarBackground'];

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { photoId?: string; settingKey?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const settingKey = body.settingKey || 'heroBackground';
  if (!VALID_HERO_KEYS.includes(settingKey)) {
    return Response.json({ error: 'Invalid hero setting key' }, { status: 400 });
  }

  if (!body.photoId) {
    return Response.json({ error: 'Photo ID is required' }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: body.photoId },
    select: { id: true, optimizedPath: true, thumbPath: true, deletedAt: true },
  });

  if (!photo || photo.deletedAt) {
    return Response.json({ error: 'Photo not found' }, { status: 404 });
  }

  const imagePath = photo.optimizedPath || photo.thumbPath;
  await setSetting(settingKey, imagePath);
  await audit(user, 'settings_updated', 'settings', undefined, null, { [settingKey]: imagePath });

  return Response.json({ ok: true, path: imagePath });
}
