import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return Response.json({ user: null });
  return Response.json({ user });
}