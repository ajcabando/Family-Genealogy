import { NextRequest } from 'next/server';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { apiAuth } from '@/lib/api-helpers';
import { resolveUploadPath, contentTypeFor } from '@/lib/files';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const auth = await apiAuth(req);
  if (auth instanceof Response) return auth;

  const rel = params.path.join('/');
  const abs = resolveUploadPath(rel);
  if (!abs) return Response.json({ error: 'Not found' }, { status: 404 });

  const headers: Record<string, string> = {
    'Content-Type': contentTypeFor(rel),
    'Cache-Control': 'private, max-age=86400',
  };
  const download = new URL(req.url).searchParams.get('download');
  if (download) {
    headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(rel.split('/').pop() || 'photo')}"`;
  }

  const stream = createReadStream(abs);
  return new Response(Readable.toWeb(stream) as ReadableStream, { headers });
}