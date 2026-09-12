import { NextRequest } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST(_req: NextRequest) {
  clearSessionCookie();
  return Response.json({ ok: true });
}