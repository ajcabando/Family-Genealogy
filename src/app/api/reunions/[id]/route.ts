import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const existing = await prisma.reunionEvent.findUnique({ where: { id: params.id } });
  if (!existing) return Response.json({ error: 'Reunion not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name) data.name = String(body.name);
  if (body.location !== undefined) data.location = String(body.location) || null;
  if (body.description !== undefined) data.description = String(body.description) || null;
  if (body.date) {
    const d = new Date(String(body.date));
    if (Number.isNaN(d.getTime())) return Response.json({ error: 'Invalid date' }, { status: 400 });
    data.date = d;
  }

  const updated = await prisma.reunionEvent.update({ where: { id: existing.id }, data: data as never });
  await audit(user, 'reunion_updated', 'reunion_event', existing.id, { name: existing.name }, { name: updated.name });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const event = await prisma.reunionEvent.findUnique({ where: { id: params.id } });
  if (!event) return Response.json({ error: 'Reunion not found' }, { status: 404 });

  await prisma.reunionEvent.delete({ where: { id: event.id } });
  await audit(user, 'reunion_deleted', 'reunion_event', event.id, null, { name: event.name });
  return Response.json({ ok: true });
}