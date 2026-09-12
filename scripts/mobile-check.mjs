// Mobile-first viewport check. Visits every main page at phone/tablet/desktop
// widths and flags horizontal overflow, console errors, and failed loads.
//
// Usage: node scripts/mobile-check.mjs [BASE_URL]
// Requires: a running app + Chrome (playwright-core is a dev dependency)
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3844';
const WIDTHS = [320, 360, 375, 390, 414, 768, 1024, 1280];

const PAGES = ['/', '/tree', '/family', '/photos', '/reunions', '/timeline', '/profile', '/contributions', '/notifications', '/admin', '/admin/approvals', '/admin/members', '/admin/users', '/admin/settings'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchIds() {
  try {
    const login = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@family.local', password: 'FamilyAdmin123!' }),
    });
    if (login.status !== 200) return { cookie: '' };
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    const headers = { cookie };
    const [mem, reunion] = await Promise.all([
      fetch(`${BASE}/api/search?q=Juan`, { headers }).then((r) => r.json()),
      fetch(`${BASE}/api/reunions`, { headers }).then((r) => r.json()),
    ]);
    return { cookie, memberId: mem.results?.[0]?.id, reunionId: reunion.events?.[0]?.id };
  } catch {
    return { cookie: '' };
  }
}

const ids = await fetchIds();
const pages = [...PAGES];
if (ids.memberId) pages.push(`/family/${ids.memberId}`);
if (ids.reunionId) pages.push(`/reunions/${ids.reunionId}`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
if (ids.cookie) {
  const [name, ...rest] = ids.cookie.split('=');
  await context.addCookies([{ name, value: rest.join('='), url: BASE }]);
}

let failures = 0;
let checks = 0;

async function checkPage(path, width) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 900 });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${String(err).slice(0, 200)}`));

  let status = 'no-response';
  try {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 25000 });
    status = res ? String(res.status()) : 'no-response';
    if (status === '200') {
      await sleep(600);
      if (path === '/tree') {
        await page.waitForSelector('.react-flow__node', { state: 'attached', timeout: 15000 }).catch(() => {});
        await sleep(400);
      }
    }
  } catch (e) {
    status = `nav-error: ${String(e).slice(0, 80)}`;
  }

  const m = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const style = getComputedStyle(el);
      if (style.position === 'fixed') continue;
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') continue;
      if (el.closest('.masonry, .react-flow, [class*="overflow-x-auto"]')) continue;
      if (r.right > doc.clientWidth + 2) {
        const cls = typeof el.className === 'string' ? el.className.split(' ').slice(0, 2).join('.') : el.tagName;
        offenders.push(`${el.tagName}.${cls} right=${Math.round(r.right)}`);
      }
    }
    return { overflow, offenders: offenders.slice(0, 4) };
  });

  const consoleErrors = errors.filter((e) => !e.includes('ERR_ABORTED') && !e.includes('Failed to load resource')).slice(0, 3);
  const bad = status !== '200' || m.overflow > 0 || consoleErrors.length > 0 || m.offenders.length > 0;
  if (bad) failures++;
  checks++;
  const icon = bad ? '✗' : '✓';
  console.log(`${icon} ${String(width).padStart(4)}px ${path} [${status}] overflow=${m.overflow}`);
  if (status !== '200') console.log(`      status: ${status}`);
  if (m.offenders.length) console.log(`      overflow elements: ${m.offenders.join(' | ')}`);
  if (consoleErrors.length) console.log(`      console: ${consoleErrors.join(' | ')}`);
  await page.close();
}

for (const path of pages) {
  for (const width of WIDTHS) {
    await checkPage(path, width);
  }
}

await browser.close();
console.log(`\n${checks} checks, ${failures} failures`);
process.exit(failures > 0 ? 1 : 0);