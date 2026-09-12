// Focused visual/DOM check for /tree: watermark opacities, minimap visibility,
// find-member dropdown clipping, and drawer-vs-hero overlap.
//
// Usage: node scripts/tree-check.mjs [baseUrl]
// Requires: a running app + Chrome (playwright-core is a dev dependency)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3844';
const OUT = '/tmp/family-tree-check';
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
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
});
page.on('pageerror', (err) => errors.push(`pageerror: ${String(err).slice(0, 200)}`));

const res = await page.goto(`${BASE}/tree`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('.react-flow__node', { state: 'attached', timeout: 15000 }).catch(() => {});
await sleep(1500);

const m = await page.evaluate(() => {
  const bgOpacity = (el) => (el ? Number(getComputedStyle(el).opacity) : null);
  // --- watermarks ---
  const pageWatermark = [...document.querySelectorAll('div[aria-hidden]')].find((d) => (d.style.backgroundImage || '').includes('tree-of-life') && d.className.includes('fixed'));
  const sidebarWatermark = [...document.querySelectorAll('aside div[aria-hidden]')].find((d) => (d.style.backgroundImage || '').includes('tree-of-life-dark'));
  const canvasWatermark = [...document.querySelectorAll('.react-flow-wrapper div[aria-hidden], div[class*=overflow-hidden] > div[aria-hidden]')].find((d) => (d.style.backgroundImage || '').includes('tree-of-life'));

  // --- minimap ---
  const minimap = document.querySelector('.react-flow__minimap');
  const minimapLabel = [...document.querySelectorAll('span')].find((s) => s.textContent.trim() === 'Minimap');
  let minimapRect = null;
  if (minimap) {
    const r = minimap.getBoundingClientRect();
    minimapRect = { w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 50 && r.height > 30 };
  }
  const labelRect = minimapLabel ? minimapLabel.getBoundingClientRect() : null;
  let labelAboveMinimap = null;
  if (minimapRect && labelRect) {
    labelAboveMinimap = Math.abs(labelRect.bottom - (minimap.getBoundingClientRect().top)) < 24;
  }

  // --- drawer vs hero ---
  const hero = document.querySelector('main > div > div.relative, main [class*=rounded-3xl]');
  const heroRect = hero ? hero.getBoundingClientRect() : null;

  return {
    pageWatermarkOpacity: bgOpacity(pageWatermark),
    sidebarWatermarkOpacity: bgOpacity(sidebarWatermark),
    canvasWatermarkOpacity: bgOpacity(canvasWatermark),
    minimap: minimapRect,
    minimapLabelPresent: !!minimapLabel,
    labelAboveMinimap,
    heroTop: heroRect ? Math.round(heroRect.top) : null,
    nodeCount: document.querySelectorAll('.react-flow__node').length,
  };
});

console.log(JSON.stringify(m, null, 2));

// --- drawer-vs-hero overlap test: click a node, measure drawer top vs hero bottom ---
const hero = await page.locator('main a[href="/tree"], main div[class*=rounded-3xl]').first();
const heroBox = await hero.boundingBox().catch(() => null);

// click the first family card node
await page.locator('.react-flow__node').first().click();
await sleep(700);
const drawerInfo = await page.evaluate((hb) => {
  const aside = document.querySelector('aside[role=dialog], main aside, aside');
  const drawers = [...document.querySelectorAll('aside')].filter((a) => a.getBoundingClientRect().width > 100);
  const d = drawers[drawers.length - 1];
  if (!d) return { found: false };
  const r = d.getBoundingClientRect();
  return {
    found: true,
    drawerTop: Math.round(r.top),
    heroBottom: hb ? Math.round(hb.y + hb.height) : null,
    overlapsHero: hb ? r.top < hb.y + hb.height - 2 : null,
  };
}, heroBox);
console.log('drawer:', JSON.stringify(drawerInfo));
if (drawerInfo.overlapsHero) issues.push('drawer overlaps hero');

// --- find-member dropdown clipping test ---
const closeBtn = page.locator('button[aria-label="Close"]').first();
if (await closeBtn.count()) {
  await closeBtn.click();
  await sleep(500);
}
await page.locator('.react-flow__pane').click({ position: { x: 60, y: 300 } }).catch(() => {});
await sleep(300);
const searchInput = page.locator('input[placeholder="Search by name..."]').first();
if (await searchInput.count()) {
  await searchInput.click();
  await searchInput.fill('a');
  await sleep(500);
  const dd = await page.evaluate(() => {
    const dropdown = [...document.querySelectorAll('div')].find((d) => d.className.includes && typeof d.className === 'string' && d.className.includes('absolute') && d.className.includes('top-full') && d.children.length > 0);
    if (!dropdown) return { found: false };
    const r = dropdown.getBoundingClientRect();
    const hero = dropdown.closest('[class*=overflow-hidden]');
    const heroRect = hero ? hero.getBoundingClientRect() : null;
    return { found: true, bottom: Math.round(r.bottom), clippedByHero: !!heroRect && r.bottom > heroRect.bottom + 2 };
  });
  console.log('find-dropdown:', JSON.stringify(dd));
  if (dd.found && dd.clippedByHero) issues.push('find-member dropdown clipped by hero');
}

// --- screenshots for eyeballing ---
await page.screenshot({ path: `${OUT}/tree-desktop.png` });
await page.setViewportSize({ width: 390, height: 844 });
await sleep(800);
await page.screenshot({ path: `${OUT}/tree-mobile.png` });

await browser.close();

for (const e of errors.slice(0, 5)) {
  console.log(`console error: ${e}`);
  if (!e.includes('ERR_ABORTED') && !e.includes('Failed to load resource')) issues.push(`console: ${e}`);
}
if ((res ? res.status() : 0) >= 400) issues.push(`HTTP ${res ? res.status() : 0}`);
if (!m.minimap || !m.minimap.visible) issues.push('minimap missing or not visible');
if (!m.minimapLabelPresent || m.labelAboveMinimap === false) issues.push('minimap label missing or misplaced');

console.log(`\nScreenshots: ${OUT}/`);
console.log(issues.length === 0 ? 'TREE CHECK PASSED' : `TREE CHECK ISSUES:\n- ${issues.join('\n- ')}`);
process.exit(issues.length === 0 ? 0 : 1);
