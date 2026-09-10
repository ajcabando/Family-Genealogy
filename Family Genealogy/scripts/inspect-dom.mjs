import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3844';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@family.local', password: 'FamilyAdmin123!' }),
});
const cookie = (loginRes.headers.get('set-cookie') || '').split(';')[0];
await context.addCookies([{ name: 'session', value: cookie.split('=').slice(1).join('='), url: BASE }]);

const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

await page.goto(`${BASE}/tree`, { waitUntil: 'networkidle' });
await page.waitForSelector('.react-flow__node', { state: 'attached' });
await page.waitForTimeout(1500);

const base = await page.evaluate(() => ({
  overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  scrollW: document.documentElement.scrollWidth,
  innerW: window.innerWidth,
  nodes: document.querySelectorAll('.react-flow__node').length,
  treeHeight: document.querySelector('.react-flow')?.getBoundingClientRect().height,
}));

// Click the first visible node to open the drawer
const firstNode = page.locator('.react-flow__node').first();
await firstNode.click({ position: { x: 90, y: 90 }, force: true });
await page.waitForTimeout(800);
const drawer = await page.evaluate(() => {
  const aside = document.querySelector('aside');
  if (!aside) return { open: false };
  const t = aside.innerText;
  return { open: true, hasViewProfile: t.includes('View full profile'), hasSuggest: t.includes('Suggest a correction'), nameShown: t.length > 40 };
});

await page.screenshot({ path: '/tmp/family-visual/tree-mobile-drawer.png' });
console.log(JSON.stringify({ base, drawer, consoleErrors: errors }, null, 2));
await browser.close();