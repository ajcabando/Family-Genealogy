// Verifies the Pinned badge + stable pinned cover on the reunion overview.
// Usage: node scripts/pin-badge-check.mjs [baseUrl]
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3844';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@family.local', password: 'FamilyAdmin123!' }),
});
if (!loginRes.ok) {
  console.error('login failed:', loginRes.status);
  process.exit(1);
}
const cookie = (loginRes.headers.get('set-cookie') || '').split(';')[0];
await context.addCookies([{ name: 'session', value: cookie.split('=').slice(1).join('='), url: BASE }]);

const ev = await (await fetch(`${BASE}/api/reunions`, { headers: { cookie } })).json();
const id = ev.events?.[0]?.id;
if (!id) {
  console.error('no reunion events');
  process.exit(1);
}

const page = await context.newPage();
await page.goto(`${BASE}/reunions/${id}`, { waitUntil: 'networkidle', timeout: 30000 });
await sleep(800);

const badges = await page.locator('span:has-text("Pinned")').count();
const pinButtons = await page.locator('button[aria-label="Album cover settings"]').count();

// Pinned album's cover must be stable across reloads (unpinned albums rotate freely)
const pinnedCover = async () =>
  page.evaluate(() => {
    const card = [...document.querySelectorAll('a')].find((a) => a.querySelector('span')?.textContent.trim() === 'Pinned');
    return card ? (card.querySelector('img')?.src || null) : null;
  });
const first = await pinnedCover();
let stable = true;
for (let i = 0; i < 3; i++) {
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(600);
  const now = await pinnedCover();
  if (now !== first) {
    stable = false;
    break;
  }
}

console.log(JSON.stringify({ badges, pinButtons, pinnedCoverStable: stable }, null, 2));
await page.screenshot({ path: '/tmp/family-tree-check/reunion-pinned.png' });
await browser.close();

const issues = [];
if (badges === 0) issues.push('no Pinned badge found (expected one on the pinned album)');
if (pinButtons === 0) issues.push('no cover-settings (pin) button found');
if (!stable) issues.push('pinned cover changed across reloads');
console.log(issues.length ? `PIN BADGE CHECK ISSUES:\n- ${issues.join('\n- ')}` : 'PIN BADGE CHECK PASSED');
process.exit(issues.length ? 1 : 0);
