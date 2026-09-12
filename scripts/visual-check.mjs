// Visual & DOM health check against a running instance (default http://localhost:3844).
// Usage: node scripts/visual-check.mjs [baseUrl]
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3844';
const OUT = '/tmp/family-visual';
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// ---- login via API to get the session cookie ----
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@family.local', password: 'FamilyAdmin123!' }),
});
if (!loginRes.ok) {
  console.error('login failed:', loginRes.status);
  process.exit(1);
}
const setCookie = loginRes.headers.get('set-cookie') || '';
const cookie = setCookie.split(';')[0];
await context.addCookies([{ name: 'session', value: cookie.split('=').slice(1).join('='), url: BASE }]);

const issues = [];
const report = [];

async function checkPage(path, { screenshot, waitFor, evaluate } = {}) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${String(err).slice(0, 300)}`));
  page.on('requestfailed', (req) => {
    const err = req.failure()?.errorText || '';
    if (err !== 'net::ERR_ABORTED') errors.push(`req failed: ${req.url()} ${err}`);
  });

  const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
  if (waitFor) {
    try {
      await page.waitForSelector(waitFor, { state: 'attached', timeout: 15000 });
    } catch {
      errors.push(`missing selector: ${waitFor}`);
    }
  }
  await sleep(1200);

  let checks = {};
  if (evaluate) {
    try {
      checks = await page.evaluate(evaluate);
    } catch (e) {
      errors.push(`evaluate failed: ${String(e).slice(0, 200)}`);
    }
  }

  const status = res ? res.status() : 0;
  const hasAppError = await page
    .locator('text=/Application error|Internal Server Error|Unhandled Runtime Error/i')
    .count()
    .catch(() => 0);
  if (status >= 400) errors.push(`HTTP ${status}`);
  if (hasAppError > 0) errors.push('application error text present');

  report.push({ path, status, errors, checks });
  await page.close();
  return { path, status, errors, checks };
}

await checkPage('/', { waitFor: 'text=Family Members' });
await checkPage('/tree', {
  waitFor: '.react-flow__node',
  evaluate: () => {
    const nodes = [...document.querySelectorAll('.react-flow__node')];
    const ids = nodes.map((n) => n.getAttribute('data-id'));
    const unique = new Set(ids).size;
    const positions = nodes
      .map((n) => n.style.transform)
      .filter(Boolean);
    const dupePos = positions.length - new Set(positions).size;
    return {
      nodes: nodes.length,
      uniqueIds: unique,
      edges: document.querySelectorAll('.react-flow__edge').length,
      dupeTransforms: dupePos,
      hasNames: document.body.innerText.includes('Cruz'),
      bodyOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      viewportW: window.innerWidth,
    };
  },
});
await checkPage('/photos', {
  waitFor: '.masonry',
  evaluate: () => ({
    images: document.querySelectorAll('.masonry img').length,
    bodyOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  }),
});
const reunionPath = await (async () => {
  const r = await fetch(`${BASE}/api/reunions`, { headers: { cookie } });
  const j = await r.json();
  return j.events?.[0] ? `/reunions/${j.events[0].id}` : null;
})();
if (reunionPath) await checkPage(reunionPath, { waitFor: 'text=Albums' });
const memberPath = await (async () => {
  const r = await fetch(`${BASE}/api/search?q=Juan+Cruz`, { headers: { cookie } });
  const j = await r.json();
  return j.results?.[0] ? `/family/${j.results[0].id}` : null;
})();
if (memberPath) await checkPage(memberPath, { waitFor: 'text=Biography' });
await checkPage('/timeline', { waitFor: 'text=Family Timeline' });
await checkPage('/admin/approvals', { waitFor: 'text=Pending Approvals' });

// ---- screenshots ----
const shot = async (path, name, viewport) => {
  const page = await context.newPage();
  try {
    await page.setViewportSize(viewport);
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (path === '/tree') await page.waitForSelector('.react-flow__node', { state: 'attached', timeout: 15000 });
    await sleep(1500);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  } catch (e) {
    console.log(`screenshot ${name} failed: ${String(e).slice(0, 150)}`);
  }
  await page.close();
};
await shot('/', 'dashboard-desktop', { width: 1440, height: 900 });
await shot('/tree', 'tree-desktop', { width: 1440, height: 900 });
await shot('/tree', 'tree-mobile', { width: 390, height: 844 });
await shot('/photos', 'photos-desktop', { width: 1440, height: 900 });

await browser.close();

// ---- report ----
let failed = 0;
for (const r of report) {
  const ok = r.errors.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${r.path} (HTTP ${r.status})`);
  for (const e of r.errors) console.log(`     - ${e}`);
  for (const [k, v] of Object.entries(r.checks)) console.log(`     ${k}: ${JSON.stringify(v)}`);
}
console.log(`\nScreenshots: ${OUT}/`);
console.log(failed === 0 ? 'VISUAL CHECK PASSED' : `VISUAL CHECK FAILED (${failed} page(s) with issues)`);
process.exit(failed === 0 ? 0 : 1);