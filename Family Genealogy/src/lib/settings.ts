import { prisma } from './db';
import { parseBool } from './utils';

let cache: Record<string, string> | null = null;
let cacheAt = 0;
const TTL = 30_000;

export const SETTING_DEFAULTS: Record<string, string> = {
  familyName: 'Family',
  photoApprovalRequired: 'true',
  contributionApprovalRequired: 'true',
  allowRegistration: 'true',
  showLivingBirthYearOnly: 'true',
  allowPhotoDownload: 'true',
};

export async function getSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  const rows = await prisma.setting.findMany();
  const merged = { ...SETTING_DEFAULTS };
  for (const r of rows) merged[r.key] = r.value;
  cache = merged;
  cacheAt = Date.now();
  return merged;
}

export async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  cache = null;
}

export async function getSettingBool(key: string): Promise<boolean> {
  const s = await getSettings();
  return parseBool(s[key]);
}