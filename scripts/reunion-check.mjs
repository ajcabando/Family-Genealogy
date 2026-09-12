// Checks /reunions/[id]: hero uses the dashboard hero background, album covers
// can vary (random pick), and no layout regressions.
// Usage: node scripts/reunion-check.mjs [baseUrl]
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
const path = `/reunions/${id}`;

const page = await context.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err).slice(0, 150)));
const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
await sleep(800);

const m = await page.evaluate(() => {
  const heroes = [...document.querySelectorAll('main .rounded-3xl, main div[class*=rounded-3xl]')];
  const hero = heroes.find((d) => [...d.querySelectorAll('div')].some((c) => (c.style.backgroundImage || '').includes('hero-beach') || (c.style.backgroundImage || '').includes('/api/files/')));
  const bgDiv = hero ? [...hero.querySelectorAll('div')].find((c) => (c.style.backgroundImage || '').includes('hero-beach') || (c.style.backgroundImage || '').includes('/api/files/')) : null;
  const covers = [...document.querySelectorAll('a img')].filter((i) => i.closest('a')?.href.includes('?album='));
  return {
    heroFound: !!bgDiv,
    heroBg: bgDiv ? bgDiv.style.backgroundImage.slice(0, 80) : null,
    heroOpacity: bgDiv ? Number(bgDiv.style.opacity) : null,
    albumCovers: covers.length,
    albumCoverUrls: covers.map((i) => i.src.split('/').pop()).slice(0, 6),
  };
});

console.log(JSON.stringify(m, null, 2));

// Randomness check: reload a few times, see if the cover set changes
let varied = false;
const firstSet = m.albumCoverUrls.join(',');
for (let i = 0; i < 4 && !varied; i++) {
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(600);
  const urls = await page.evaluate(() => [...document.querySelectorAll('a img')].filter((i) => i.closest('a')?.href.includes('?album=')).map((i) => i.src.split('/').pop()));
  if (urls.join(',') !== firstSet) varied = true;
}
console.log('coverVariesOnReload:', varied);

await page.screenshot({ path: '/tmp/family-tree-check/reunion-detail.png' });
await browser.close();

const issues = [];
if (res.status() !== 200) issues.push(`HTTP ${res.status()}`);
if (!m.heroFound) issues.push('hero background not found (expected dashboard-style bg image)');
if (m.heroOpacity === null || m.heroOpacity < 0.1 || m.heroOpacity > 1) issues.push('hero opacity out of range');
for (const e of errors) issues.push(`pageerror: ${e}`);
console.log(issues.length ? `REUNION CHECK ISSUES:\n- ${issues.join('\n- ')}` : 'REUNION CHECK PASSED');
process.exit(issues.length ? 1 : 0);
