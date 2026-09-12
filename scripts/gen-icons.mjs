// Generates PWA icons into public/icons/. Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('public/icons');
fs.mkdirSync(outDir, { recursive: true });

// Warm cream background, gold tree mark, dark ring — matches the app palette.
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#faf7f1"/>
  <rect x="18" y="18" width="476" height="476" rx="80" fill="none" stroke="#d9cdb4" stroke-width="8"/>
  <g fill="none" stroke="#8a6d38" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
    <path d="M256 96v96"/>
    <path d="M206 150l50-38 50 38"/>
    <path d="M160 232c0-34 43-52 96-52s96 18 96 52"/>
    <path d="M160 232v48"/>
    <path d="M352 232v48"/>
    <path d="M96 392h320"/>
    <path d="M96 392v40"/>
    <path d="M416 392v40"/>
    <path d="M256 280v112"/>
    <path d="M160 280v112"/>
    <path d="M352 280v112"/>
    <circle cx="256" cy="68" r="22" fill="#8a6d38" stroke="none"/>
    <circle cx="160" cy="160" r="18" fill="#8a6d38" stroke="none"/>
    <circle cx="352" cy="160" r="18" fill="#8a6d38" stroke="none"/>
  </g>
</svg>`;

for (const [name, size] of [
  ['icon-192', 192],
  ['icon-512', 512],
  ['apple-touch-icon', 180],
]) {
  await sharp(Buffer.from(svg(512))).resize(size, size).png().toFile(path.join(outDir, `${name}.png`));
  console.log(`generated ${name}.png (${size}x${size})`);
}