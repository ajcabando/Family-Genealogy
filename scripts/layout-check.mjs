// Audits the app shell + every page across the spec's breakpoints.
// Usage: node scripts/layout-check.mjs [BASE_URL]
// Requires: a running app + Chrome (playwright-core is a dev dependency)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3844';
const OUT = '/tmp/family-layout';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  ['/', 'Dashboard'],
  ['/tree', 'Family Tree'],
  ['/family', 'Family'],
  ['/photos', 'Photos'],
  ['/reunions', 'Reunions'],
  ['/timeline', 'Timeline'],
  ['/profile', 'My Profile'],
  ['/contributions', 'Contributions'],
  ['/notifications', 'Notifications'],
  ['/guide', 'Guide'],
  ['/admin', 'Admin'],
];

// Spec breakpoints: mobile 320-414, tablet 768-1023, desktop 1024+, large 1440+.
const WIDTHS = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440];

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@family.local', password: 'FamilyAdmin123!' }),
});
if (!login.ok) {
  console.error('login failed:', login.status);
  process.exit(1);
}
const cookie = (login.headers.get('set-cookie') || '').split(';')[0];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ hasTouch: true });
await context.addCookies([{ name: 'session', value: cookie.split('=').slice(1).join('='), url: BASE }]);

const failures = [];
const note = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures.push(msg);
};

// Anything that visually escapes the viewport without an intentional scroller is a bug.
async function audit(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const insideScroller = (el) => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
        p = p.parentElement;
      }
      return false;
    };
    const bad = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right <= doc.clientWidth + 1 && r.left >= -1) continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      if (getComputedStyle(el).position === 'fixed') continue;
      if (insideScroller(el)) continue;
      bad.push(`${el.tagName}.${String(el.className).slice(0, 34)}`);
    }
    const sidebar = document.querySelector('aside');
    const bottomNav = document.querySelector('nav[aria-label="Primary"]');
    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      bad: [...new Set(bad)].slice(0, 5),
      sidebarVisible: !!sidebar && sidebar.getBoundingClientRect().width > 100,
      bottomNavVisible: !!bottomNav && bottomNav.getBoundingClientRect().height > 20,
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 40) || '',
      text: document.body.innerText.slice(0, 4000),
      errors: window.__errors || [],
    };
  });
}

// ---------------- per-page responsive sweep ----------------
{
  const page = await context.newPage();
  const overflow = [];
  const missing = [];
  for (const [path, label] of PAGES) {
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 820 });
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(900);
      const r = await audit(page);
      if (r.overflowX > 0 || r.bad.length) {
        overflow.push(`${label}@${w}px overflow=${r.overflowX} ${r.bad.join(', ')}`);
      }
      if (/Application error|Unhandled Runtime Error|This page could not be found/.test(r.text)) {
        missing.push(`${label}@${w}px`);
      }
    }
    // Screenshot each page once at mobile + desktop for eyeballing.
    for (const w of [390, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(1000);
      await page.screenshot({ path: `${OUT}/${label.replace(/\s+/g, '-').toLowerCase()}-${w}.png` });
    }
  }
  note(overflow.length === 0, `responsive: no overflow on any page at ${WIDTHS.join('/')}px${overflow.length ? ` — ${overflow.slice(0, 6).join(' | ')}` : ''}`);
  note(missing.length === 0, `pages: all ${PAGES.length} render without error${missing.length ? ` — ${missing.join(', ')}` : ''}`);
  await page.close();
}

// ---------------- shell structure ----------------
{
  const page = await context.newPage();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await sleep(900);
  const desktop = await audit(page);
  note(desktop.sidebarVisible, 'desktop: sidebar is rendered');
  note(!desktop.bottomNavVisible, 'desktop: mobile bottom nav is hidden');
  const sidebarBg = await page.evaluate(() => {
    const el = document.querySelector('aside');
    return el ? getComputedStyle(el).backgroundColor : '';
  });
  note(sidebarBg === 'rgb(23, 24, 47)', `desktop: sidebar uses the dark navy (#17182F) — got ${sidebarBg}`);
  const navCount = await page.locator('aside nav a').count();
  note(navCount >= 10, `desktop: sidebar shows the full nav (${navCount} links)`);
  const searchBox = await page.locator('input[type="search"]').count();
  note(searchBox > 0, 'desktop: top header search is present');
  await page.screenshot({ path: `${OUT}/shell-desktop.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await sleep(900);
  const mobile = await audit(page);
  note(!mobile.sidebarVisible, 'mobile: sidebar is hidden');
  note(mobile.bottomNavVisible, 'mobile: bottom nav is rendered');
  const tabs = await page.locator('nav[aria-label="Primary"] a').count();
  note(tabs === 4, `mobile: bottom nav has the 4 primary tabs (${tabs})`);

  await page.getByRole('button', { name: 'More navigation' }).click();
  await sleep(600);
  const sheet = page.locator('[role="dialog"][aria-label="More navigation"]');
  const sheetBox = await sheet.boundingBox();
  note(!!sheetBox && sheetBox.width <= 390 + 1, `mobile: More opens a sheet that fits the viewport (${Math.round(sheetBox?.width || 0)}px)`);
  const sheetLinks = await sheet.locator('a').count();
  note(sheetLinks >= 10, `mobile: More sheet exposes every destination (${sheetLinks} links)`);
  await page.screenshot({ path: `${OUT}/shell-mobile-more.png` });
  await page.close();
}

// ---------------- dashboard content ----------------
{
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  const text = await page.evaluate(() => document.body.innerText);
  note(/Welcome to our family archive/i.test(text), 'dashboard: hero headline renders');
  note(/Explore Family Tree/i.test(text) && /View Photos/i.test(text), 'dashboard: hero actions render');
  for (const label of ['Family Members', 'Generations', 'Family Branches', 'Photos', 'Reunions', 'Pending Approvals']) {
    note(new RegExp(label, 'i').test(text), `dashboard: "${label}" statistic renders`);
  }
  note(/Recently added family members/i.test(text), 'dashboard: recent members section renders');
  note(/Recently uploaded photos/i.test(text), 'dashboard: recent photos section renders');
  note(/Family history/i.test(text), 'dashboard: family history section renders');
  note(/Recent activity/i.test(text), 'dashboard: activity section renders');
  const hrefs = await page.locator('a[href^="/photos?photo="]').count();
  note(hrefs > 0, `dashboard: photo tiles deep-link into the viewer (${hrefs})`);
  await page.close();
}

await browser.close();
console.log(`\nScreenshots: ${OUT}/`);
console.log(failures.length === 0 ? 'LAYOUT CHECK PASSED' : `LAYOUT CHECK FAILED (${failures.length})`);
process.exit(failures.length === 0 ? 0 : 1);
