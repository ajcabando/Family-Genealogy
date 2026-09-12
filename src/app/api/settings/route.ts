import { NextRequest } from 'next/server';
import { apiAuth } from '@/lib/api-helpers';
import { getSettings, setSetting, SETTING_DEFAULTS } from '@/lib/settings';
import { audit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  return Response.json({ settings: await getSettings() });
}

export async function PATCH(req: NextRequest) {
  const auth = await apiAuth(req, { admin: true });
  if (auth instanceof Response) return auth;
  const { user } = auth;

  let body: { values?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const values = body.values || {};
  const changed: Record<string, { from: string; to: string }> = {};

  for (const [key, value] of Object.entries(values)) {
    if (!(key in SETTING_DEFAULTS)) continue;
    const before = await getSettings();
    if (before[key] !== String(value)) {
      await setSetting(key, String(value));
      changed[key] = { from: before[key], to: String(value) };
    }
  }

  if (Object.keys(changed).length) {
    await audit(user, 'settings_updated', 'settings', undefined, null, changed);
  }
  return Response.json({ ok: true });
}