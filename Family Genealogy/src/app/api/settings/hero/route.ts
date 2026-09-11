import { NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import Busboy from 'busboy';
import { apiAuth } from '@/lib/api-helpers';
import { setSetting } from '@/lib/settings';
import { storeImage } from '@/lib/files';
import { audit } from '@/lib/audit';

const VALID_HERO_KEYS = ['heroBackground', 'photosHeroBackground', 'treeHeroBackground', 'sidebarBackground'];

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const settingKey = searchParams.get('key') || 'heroBackground';
  if (!VALID_HERO_KEYS.includes(settingKey)) {
    return Response.json({ error: 'Invalid hero setting key' }, { status: 400 });
  }

  const contentType = req.headers.get('content-type') || '';
  const busboy = Busboy({ headers: { 'content-type': contentType }, limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

  let fileBuffer: Buffer | null = null;
  let uploadError = '';

  await new Promise<void>((resolve) => {
    busboy.on('file', (_name, stream, info) => {
      if (!info.mimeType.startsWith('image/')) {
        uploadError = `Unsupported file type: ${info.mimeType}`;
        stream.resume();
        return;
      }
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('error', () => { uploadError = 'File upload failed'; });
      stream.on('limit', () => { uploadError = 'File too large (max 10MB)'; });
      stream.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });
    busboy.on('close', () => resolve());
    busboy.on('error', () => { uploadError = 'Upload failed'; resolve(); });
    Readable.fromWeb(req.body as never).pipe(busboy);
  });

  if (uploadError) return Response.json({ error: uploadError }, { status: 400 });
  if (!fileBuffer) return Response.json({ error: 'No image provided' }, { status: 400 });

  const img = await storeImage(fileBuffer);
  await setSetting(settingKey, img.optimizedPath);
  await audit(user, 'settings_updated', 'settings', undefined, null, { [settingKey]: img.optimizedPath });

  return Response.json({ ok: true, path: img.optimizedPath });
}

export async function DELETE(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const settingKey = searchParams.get('key') || 'heroBackground';
  if (!VALID_HERO_KEYS.includes(settingKey)) {
    return Response.json({ error: 'Invalid hero setting key' }, { status: 400 });
  }

  await setSetting(settingKey, '');
  await audit(user, 'settings_updated', 'settings', undefined, null, { [settingKey]: '' });

  return Response.json({ ok: true });
}
