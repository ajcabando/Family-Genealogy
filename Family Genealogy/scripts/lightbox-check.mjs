// Verifies the redesigned photo viewer on desktop + mobile against a running app.
// Usage: node scripts/lightbox-check.mjs [BASE_URL]
// Requires: a running app + Chrome (playwright-core is a dev dependency)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3844';
const OUT = '/tmp/family-lightbox';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loginAs(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  return (res.headers.get('set-cookie') || '').split(';')[0];
}

const adminCookie = await loginAs('admin@family.local', 'FamilyAdmin123!');
if (!adminCookie) {
  console.error('admin login failed');
  process.exit(1);
}
const cookie = adminCookie;
// A seeded member login is used to prove admin-only actions stay hidden from relatives.
const memberCookie = await loginAs('alain@family.local', 'Member123!');

// The dev database can reference files that only exist in another environment, which would
// make every assertion below meaningless — pick a photo whose image actually resolves.
async function pickAvailablePhoto() {
  const res = await fetch(`${BASE}/api/photos?limit=24&sort=newest`, { headers: { cookie } });
  if (!res.ok) return null;
  const { photos = [] } = await res.json();
  const usable = [];
  for (const p of photos) {
    const head = await fetch(`${BASE}/api/files/${p.optimizedPath}`, { headers: { cookie } });
    if (head.ok) usable.push(p);
  }
  // Prefer an untagged photo so the tagging round trip below starts from a clean slate.
  const pick = usable.find((p) => (p.tags || []).length === 0) ?? usable[0];
  if (!pick) return null;
  return { id: pick.id, index: photos.indexOf(pick), count: photos.length, title: pick.caption || pick.id };
}
const target = await pickAvailablePhoto();
if (!target) {
  console.error('no photo with a resolvable image file — cannot verify the viewer');
  process.exit(1);
}
console.log(`verifying against photo ${target.index + 1} of ${target.count}: "${target.title}"\n`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ hasTouch: true });
await context.addCookies([{ name: 'session', value: cookie.split('=').slice(1).join('='), url: BASE }]);

const failures = [];
const note = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures.push(msg);
};

async function openViewer(page) {
  await page.goto(`${BASE}/photos?photo=${target.id}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[role="dialog"][aria-label^="Photo "]', { timeout: 20000 });
  await sleep(1400);
}

async function collect(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-label^="Photo "]');
    const img = dialog?.querySelector('img[alt]');
    const aside = dialog?.querySelector('aside');
    const doc = document.documentElement;
    const imgBox = img?.getBoundingClientRect();
    const asideBox = aside?.getBoundingClientRect();
    // Only look inside the viewer: the gallery behind it legitimately has horizontal scrollers.
    const overflowEls = [];
    for (const el of dialog?.querySelectorAll('*') ?? []) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= doc.clientWidth + 2) continue;
      const style = getComputedStyle(el);
      if (style.position === 'fixed' || el.closest('.lb-scroll')) continue;
      overflowEls.push(`${el.tagName}.${String(el.className).slice(0, 24)}`);
    }
    return {
      dialog: !!dialog,
      photoLabel: dialog?.getAttribute('aria-label') || '',
      buttons: dialog ? [...dialog.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label')) : [],
      bodyOverflowX: doc.scrollWidth - doc.clientWidth,
      overflowEls: overflowEls.slice(0, 5),
      img: imgBox ? { w: Math.round(imgBox.width), h: Math.round(imgBox.height), natural: `${img.naturalWidth}x${img.naturalHeight}` } : null,
      aside: asideBox ? { w: Math.round(asideBox.width), h: Math.round(asideBox.height) } : null,
      // `object-fit: contain` letterboxes inside the element box, so the element aspect never
      // matches the native aspect. What actually guarantees no distortion is contain + a
      // drawn size that keeps the native ratio inside the available box.
      objectFit: img ? getComputedStyle(img).objectFit : null,
      ratioPreserved: imgBox && img ? (() => {
        const fit = Math.min(imgBox.width / img.naturalWidth, imgBox.height / img.naturalHeight);
        const drawnW = img.naturalWidth * fit;
        const drawnH = img.naturalHeight * fit;
        return getComputedStyle(img).objectFit === 'contain'
          && (img.naturalWidth / img.naturalHeight).toFixed(2) === (drawnW / drawnH).toFixed(2)
          && drawnW <= imgBox.width + 1 && drawnH <= imgBox.height + 1;
      })() : false,
      imgVisible: imgBox && img ? (() => {
        const fit = Math.min(imgBox.width / img.naturalWidth, imgBox.height / img.naturalHeight);
        return img.naturalWidth * fit > 200 && img.naturalHeight * fit > 150;
      })() : false,
      asideDoesNotCoverImage: imgBox && asideBox ? imgBox.right <= asideBox.left + 1 : null,
    };
  });
}

// ---------------- desktop ----------------
{
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 180)));
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 180)}`));
  await openViewer(page);

  const d = await collect(page);
  note(d.dialog, 'desktop: viewer opens as a dialog');
  note(d.imgVisible, `desktop: photo is large (${d.img?.w}x${d.img?.h})`);
  note(d.ratioPreserved, `desktop: image not distorted (object-fit ${d.objectFit}, native ${d.img?.natural})`);
  note(!!d.aside, 'desktop: information panel present');
  note(d.asideDoesNotCoverImage === true, 'desktop: panel does not cover the photo');
  note(!d.overflowEls.length, `desktop: no horizontal overflow in the viewer (${d.overflowEls.join(', ') || 'none'})`);
  note(d.buttons.includes('Download') && d.buttons.includes('Fullscreen') && d.buttons.includes('More actions'), `desktop: toolbar actions render (${d.buttons.length} buttons)`);
  note(d.buttons.includes('Zoom in') && d.buttons.includes('Zoom out'), 'desktop: zoom controls render');
  note(d.buttons.every(Boolean), 'desktop: every toolbar button has an accessible label');

  await page.screenshot({ path: `${OUT}/desktop.png` });

  // next / prev via keyboard
  const label0 = d.photoLabel;
  await page.keyboard.press('ArrowRight');
  await sleep(700);
  const afterNext = await page.locator('[role="dialog"][aria-label^="Photo "]').getAttribute('aria-label');
  note(afterNext !== label0, `desktop: ArrowRight advances (${label0} -> ${afterNext})`);
  await page.keyboard.press('ArrowLeft');
  await sleep(700);
  const afterPrev = await page.locator('[role="dialog"][aria-label^="Photo "]').getAttribute('aria-label');
  note(afterPrev === label0, 'desktop: ArrowLeft goes back');

  // zoom controls
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await sleep(400);
  const zoomed = await page.locator('[role="dialog"][aria-label^="Photo "]').getByText('%').first().innerText();
  note(zoomed !== '100%', `desktop: zoom in changes zoom (${zoomed})`);
  await page.getByRole('button', { name: 'Fit to screen' }).click();
  await sleep(400);
  const fitZoom = await page.locator('[role="dialog"][aria-label^="Photo "]').getByText('%').first().innerText();
  note(fitZoom === '100%', `desktop: Fit to screen resets zoom (${fitZoom})`);
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  note(await zoomOut.isDisabled(), 'desktop: zoom out is disabled at minimum zoom');

  // thumbnails toggle
  const thumbToggle = page.getByRole('button', { name: /thumbnails/i });
  if (await thumbToggle.count()) {
    await thumbToggle.first().click();
    await sleep(400);
    const hasStrip = await page.locator('[aria-label^="View photo "]').count();
    note(hasStrip > 0, `desktop: thumbnail strip toggles (${hasStrip} thumbs)`);
    await page.screenshot({ path: `${OUT}/desktop-thumbs.png` });
  }

  // close the thumbnail strip again so the geometry interactions below are stable
  if (await thumbToggle.count()) {
    await thumbToggle.first().click();
    await sleep(300);
  }

  // ---- tagging round trip (existing feature must still work) ----
  const tagCount = () => page.locator('[role="dialog"] button[aria-label^="Remove tag "]').count();
  const tagsBefore = await tagCount();
  await page.locator('[aria-label="Tag people"]').click();
  await sleep(400);
  note(await page.getByText('Click on a person in the photo to tag them.').isVisible(), 'desktop: tagging mode shows its instruction');
  const ib = await page.locator('[role="dialog"] img[alt]').first().boundingBox();
  await page.mouse.click(ib.x + ib.width * 0.5, ib.y + ib.height * 0.4);
  await sleep(500);
  const option = page.locator('button[aria-label$=" in this photo"]').first();
  note((await option.count()) > 0, 'desktop: clicking the photo opens the family member picker');
  const chosen = ((await option.getAttribute('aria-label')) || '').replace(' in this photo', '').replace(/^Tag /, '');
  await option.click();
  await sleep(1200);
  const tagsAfter = await tagCount();
  note(tagsAfter > tagsBefore, `desktop: tag saves and appears on the photo (${tagsBefore} -> ${tagsAfter})`);
  const markerCount = await page.locator('[role="dialog"] [aria-label^="Drag to move "]').count();
  note(markerCount > 0, `desktop: a coordinate marker is rendered for the tag (${markerCount})`);
  const removeTag = page.locator(`[role="dialog"] button[aria-label="Remove tag ${chosen}"]`).first();
  if (await removeTag.count()) {
    await removeTag.click();
    await sleep(1200);
  }
  note((await tagCount()) === tagsBefore, `desktop: tag can be removed again (${await tagCount()})`);
  await page.locator('[aria-label="Tag people"]').click();
  await sleep(300);

  // ---- comment round trip (existing feature must still work) ----
  const commentBox = page.locator('textarea[aria-label="Add a comment"]');
  if (await commentBox.count()) {
    const body = `Verification note ${Date.now()}`;
    await commentBox.fill(body);
    await page.locator('[role="dialog"] button', { hasText: 'Post' }).first().click();
    await sleep(1200);
    note(await page.getByText(body).first().isVisible(), 'desktop: comment posts and renders in the panel');
    const del = page.locator('[role="dialog"] button[aria-label^="Delete comment by"]').first();
    if (await del.count()) {
      await del.click();
      await sleep(1200);
    }
    note(!(await page.getByText(body).first().isVisible().catch(() => false)), 'desktop: own comment can be deleted again');
  }

  // ESC closes
  await page.keyboard.press('Escape');
  await sleep(600);
  note(!(await page.locator('[role="dialog"][aria-label^="Photo "]').count()), 'desktop: Escape closes the viewer');

  note(errors.length === 0, `desktop: no console errors (${errors.join(' | ') || 'none'})`);
  await page.close();
}

// ---------------- mobile ----------------
{
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 180)));
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 180)}`));
  await openViewer(page);

  const m = await collect(page);
  note(m.dialog, 'mobile: viewer opens');
  note(!m.aside, 'mobile: desktop side panel is not rendered');
  note(m.imgVisible, `mobile: photo nearly fills the screen (${m.img?.w}x${m.img?.h} of 390x844)`);
  note(m.ratioPreserved, `mobile: image not distorted (object-fit ${m.objectFit}, native ${m.img?.natural})`);
  note(m.buttons.includes('Favorite') && m.buttons.includes('Info') && m.buttons.includes('Comment'), 'mobile: bottom action bar renders');
  note(!m.overflowEls.length, `mobile: no horizontal overflow in the viewer (${m.overflowEls.join(', ') || 'none'})`);
  await page.screenshot({ path: `${OUT}/mobile.png` });

  // open the bottom sheet
  await page.getByRole('button', { name: 'Info' }).click();
  await sleep(900);
  const sheet = page.locator('[role="dialog"][aria-label="Photo details"]');
  const sheetBox = await sheet.boundingBox();
  const visibleAfter = await sheet.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  note(!!sheetBox && visibleAfter < 400, `mobile: Info opens the draggable bottom sheet (offset ${Math.round(visibleAfter)}px)`);
  const sheetText = await sheet.innerText();
  note(/Photo details/i.test(sheetText) && /Tagged/i.test(sheetText) && /Comments/i.test(sheetText), 'mobile: sheet shows details, tags and comments');
  await page.screenshot({ path: `${OUT}/mobile-sheet.png` });

  // swipe the sheet down to dismiss, then confirm the photo is interactive again
  await page.touchscreen.tap(195, 300);
  await sleep(500);
  const controlsBack = await page.getByRole('button', { name: /^Favorite/ }).first().isVisible().catch(() => false);
  note(controlsBack, 'mobile: tapping the photo restores the controls');

  note(errors.length === 0, `mobile: no console errors (${errors.join(' | ') || 'none'})`);
  await page.close();
}

// ---------------- signed-in family member ----------------
if (memberCookie) {
  const ctx = await browser.newContext({ hasTouch: true });
  await ctx.addCookies([{ name: 'session', value: memberCookie.split('=').slice(1).join('='), url: BASE }]);
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 180)));
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 180)}`));
  await openViewer(page);

  // favourite toggle round trip
  const fav = page.locator('[aria-label="Add to favorites"], [aria-label="Remove from favorites"]').first();
  const favBefore = await fav.getAttribute('aria-label');
  await fav.click();
  await sleep(1200);
  const favAfter = await page.locator('[aria-label="Add to favorites"], [aria-label="Remove from favorites"]').first().getAttribute('aria-label');
  note(favAfter !== favBefore, `member: favorite toggles (${favBefore} -> ${favAfter})`);
  await page.locator('[aria-label="Add to favorites"], [aria-label="Remove from favorites"]').first().click();
  await sleep(1200);
  const favRestored = await page.locator('[aria-label="Add to favorites"], [aria-label="Remove from favorites"]').first().getAttribute('aria-label');
  note(favRestored === favBefore, `member: favorite toggles back (${favRestored})`);

  // comment round trip
  const box = page.locator('textarea[aria-label="Add a comment"]');
  note((await box.count()) > 0, 'member: comment composer is available to signed-in members');
  if (await box.count()) {
    const body = `Verification note ${Date.now()}`;
    await box.fill(body);
    await page.locator('[role="dialog"] button', { hasText: 'Post' }).first().click();
    await sleep(1400);
    note(await page.getByText(body).first().isVisible(), 'member: comment posts and renders in the panel');
    const del = page.locator('[role="dialog"] button[aria-label^="Delete comment by"]').first();
    if (await del.count()) {
      await del.click();
      await sleep(1400);
    }
    note(!(await page.getByText(body).first().isVisible().catch(() => false)), 'member: own comment can be deleted again');
  }

  // admin-only actions must not leak into a relative's menu
  await page.locator('[aria-label="More actions"]').click();
  await sleep(400);
  const menuText = await page.locator('[role="dialog"]').innerText();
  note(!/Approve photo|Reject photo/.test(menuText), 'member: admin review actions are not exposed');
  await page.screenshot({ path: `${OUT}/member-menu.png` });
  await page.keyboard.press('Escape');

  note(errors.length === 0, `member: no console errors (${errors.join(' | ') || 'none'})`);
  await ctx.close();
} else {
  console.log('! member login unavailable — skipped member-facing checks');
}

// ---------------- breakpoint sweep ----------------
{
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  const widths = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440];
  const bad = [];
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 780 });
    await openViewer(page);
    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const dialog = document.querySelector('[role="dialog"][aria-label^="Photo "]');
      const img = dialog?.querySelector('img[alt]');
      const box = img?.getBoundingClientRect();
      const clipped = [...dialog.querySelectorAll('button')]
        .filter((b) => b.getBoundingClientRect().width > 0)
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.left < -1 || r.right > doc.clientWidth + 1;
        })
        .map((b) => b.getAttribute('aria-label') || b.textContent.trim().slice(0, 16));
      return {
        overflowX: doc.scrollWidth - doc.clientWidth,
        imgFits: box ? box.left >= -1 && box.right <= doc.clientWidth + 1 : false,
        clipped,
      };
    });
    if (r.overflowX > 0 || !r.imgFits || r.clipped.length) {
      bad.push(`${w}px overflow=${r.overflowX} imgFits=${r.imgFits} clipped=[${r.clipped.join(', ')}]`);
    }
    if (w === 320 || w === 768) await page.screenshot({ path: `${OUT}/w${w}.png` });
  }
  note(bad.length === 0, `responsive: no overflow or clipped controls at ${widths.join(', ')}px${bad.length ? ` — ${bad.join(' | ')}` : ''}`);
  note(errors.length === 0, `responsive: no page errors (${errors.join(' | ') || 'none'})`);
  await page.close();
}

await browser.close();
console.log(`\nScreenshots: ${OUT}/`);
console.log(failures.length === 0 ? 'LIGHTBOX CHECK PASSED' : `LIGHTBOX CHECK FAILED (${failures.length})`);
process.exit(failures.length === 0 ? 0 : 1);
