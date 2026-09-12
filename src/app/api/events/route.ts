import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiAuth } from '@/lib/api-helpers';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { title?: string; eventDate?: string; eventType?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!body.title || !body.eventDate) return Response.json({ error: 'Title and date are required' }, { status: 400 });
  const date = new Date(body.eventDate);
  if (Number.isNaN(date.getTime())) return Response.json({ error: 'Invalid date' }, { status: 400 });

  const event = await prisma.familyEvent.create({
    data: {
      title: body.title,
      eventDate: date,
      eventType: (body.eventType as never) || 'MILESTONE',
      description: body.description || null,
      createdById: user.id,
    },
  });
  await audit(user, 'event_added', 'family_event', event.id, null, { title: event.title, date: event.eventDate.toISOString() });
  return Response.json({ id: event.id });
}