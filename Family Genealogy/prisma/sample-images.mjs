// SVG image generators shared by the seed and the reunion-photo filler script.
// Everything is drawn from shapes + text — no external assets, so it works in
// an air-gapped container.

export function escapeXml(s) {
  return String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

export const AVATAR_PALETTE = {
  MALE: ['#dbe3ea', '#8fa3b5', '#3d4a57'],
  FEMALE: ['#f3e3e0', '#d9a99f', '#6e4238'],
  OTHER: ['#e4ead9', '#a9bb93', '#4a5a38'],
  UNKNOWN: ['#efe8dc', '#c9b491', '#6b5737'],
};

export function avatarSvg(member) {
  const [bg1, bg2, ink] = AVATAR_PALETTE[member.gender] || AVATAR_PALETTE.UNKNOWN;
  const initials = `${(member.firstName || '?')[0]}${(member.lastName || '?')[0]}`.toUpperCase();
  const deceased = member.deathDate ? ' saturate(0.35)' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="320" height="320" fill="url(#g)" style="filter:${deceased}"/>
  <circle cx="160" cy="118" r="52" fill="rgba(255,255,255,0.75)"/>
  <circle cx="160" cy="118" r="52" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="3"/>
  <rect x="52" y="196" width="216" height="52" rx="26" fill="rgba(255,255,255,0.55)"/>
  <text x="160" y="133" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="${ink}" text-anchor="middle">${initials}</text>
  <text x="160" y="232" font-family="Georgia, serif" font-size="24" fill="${ink}" text-anchor="middle">${escapeXml(member.firstName)} ${escapeXml(member.lastName)}</text>
</svg>`;
}

// Abstract landscape scene (used for historical photos).
export function sceneSvg({ title, sub, hue, w = 1280, h = 854 }) {
  const [sky1, sky2, land, accent] = hue;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky1}"/>
      <stop offset="1" stop-color="${sky2}"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff8e7" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#fff8e7" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="${w * 0.72}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.22}" fill="url(#sun)"/>
  <path d="M0 ${h * 0.62} Q ${w * 0.25} ${h * 0.5} ${w * 0.5} ${h * 0.62} T ${w} ${h * 0.58} L ${w} ${h} L 0 ${h} Z" fill="${land}" opacity="0.85"/>
  <path d="M0 ${h * 0.75} Q ${w * 0.33} ${h * 0.64} ${w * 0.66} ${h * 0.76} T ${w} ${h * 0.72} L ${w} ${h} L 0 ${h} Z" fill="${land}" opacity="0.55"/>
  <rect x="0" y="${h * 0.68}" width="${w}" height="${h * 0.32}" fill="rgba(255,255,255,0.25)"/>
  <text x="${w / 2}" y="${h * 0.4}" font-family="Georgia, serif" font-size="${Math.round(h * 0.07)}" font-weight="bold" fill="#3a2f22" text-anchor="middle">${escapeXml(title)}</text>
  <text x="${w / 2}" y="${h * 0.4 + Math.round(h * 0.085)}" font-family="Georgia, serif" font-size="${Math.round(h * 0.04)}" fill="#5c4a33" text-anchor="middle">${escapeXml(sub)}</text>
  <rect x="${w / 2 - Math.round(w * 0.06)}" y="${h * 0.4 - Math.round(h * 0.015)}" width="${Math.round(w * 0.12)}" height="4" fill="${accent}" rx="2"/>
</svg>`;
}

// Family-reunion style group photo: people silhouettes standing together in
// front of a warm backdrop. Looks like a real gathering instead of a gradient.
export function groupPhotoSvg({ title, sub, w = 1280, h = 854 }) {
  const n = 9;
  const spacing = w / (n + 1);
  let people = '';
  for (let i = 0; i < n; i++) {
    const x = spacing * (i + 1) + (i % 2 === 0 ? 0 : 18);
    const hScale = 0.82 + ((i * 7) % 4) * 0.06; // varied heights
    const bw = w * 0.062;
    const bh = h * 0.3 * hScale;
    const by = h * 0.72 - bh;
    const skin = ['#6b4a35', '#8a5a3a', '#5d4037', '#96623f', '#7a4e32', '#8c5c3b', '#67422f', '#9c6a43', '#77503a'][i];
    const shirt = ['#8a6d38', '#a4583c', '#7a8b6f', '#5c6f8a', '#9a7b4f', '#6e5a8a', '#b08d4f', '#4f6b5f', '#8a5c4f'][i];
    people += `
  <g>
    <circle cx="${x}" cy="${by - bw * 0.85}" r="${bw * 0.42}" fill="${skin}"/>
    <path d="M${x - bw * 0.55} ${by} Q${x} ${by - bw * 1.35} ${x + bw * 0.55} ${by} Q${x + bw * 0.72} ${by - bw * 0.28} ${x + bw * 0.34} ${by - bw * 0.42} Q${x + bw * 0.5} ${by - bw * 0.95} ${x + bw * 0.24} ${by - bw * 0.9} L${x} ${by - bw * 1.05} L${x - bw * 0.24} ${by - bw * 0.9} Q${x - bw * 0.5} ${by - bw * 0.95} ${x - bw * 0.34} ${by - bw * 0.42} Q${x - bw * 0.72} ${by - bw * 0.28} ${x - bw * 0.55} ${by} Z" fill="${shirt}"/>
    <rect x="${x - bw * 0.6}" y="${by}" width="${bw * 1.2}" height="${h - by}" fill="${shirt}" opacity="0.9"/>
  </g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f9d9a8"/>
      <stop offset="1" stop-color="#eab676"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff6dd" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#fff6dd" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9a06a"/>
      <stop offset="1" stop-color="#8f7a4c"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="${w * 0.5}" cy="${h * 0.24}" r="${Math.min(w, h) * 0.2}" fill="url(#sun)"/>
  <rect y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="url(#ground)"/>
  <path d="M0 ${h * 0.7} Q ${w * 0.3} ${h * 0.62} ${w * 0.6} ${h * 0.7} T ${w} ${h * 0.66} L ${w} ${h * 0.7} L 0 ${h * 0.7} Z" fill="#7fae6f" opacity="0.5"/>
  ${people}
  <rect x="${w / 2 - Math.round(w * 0.18)}" y="${h * 0.08}" width="${Math.round(w * 0.36)}" height="${Math.round(h * 0.12)}" rx="${Math.round(h * 0.02)}" fill="rgba(255,255,255,0.75)"/>
  <text x="${w / 2}" y="${h * 0.08 + Math.round(h * 0.055)}" font-family="Georgia, serif" font-size="${Math.round(h * 0.05)}" font-weight="bold" fill="#3a2f22" text-anchor="middle">${escapeXml(title)}</text>
  <text x="${w / 2}" y="${h * 0.08 + Math.round(h * 0.095)}" font-family="Georgia, serif" font-size="${Math.round(h * 0.028)}" fill="#5c4a33" text-anchor="middle">${escapeXml(sub)}</text>
  <rect x="${w * 0.06}" y="${h * 0.08}" width="${w * 0.03}" height="${h * 0.12}" rx="6" fill="rgba(255,255,255,0.35)"/>
  <rect x="${w * 0.91}" y="${h * 0.08}" width="${w * 0.03}" height="${h * 0.12}" rx="6" fill="rgba(255,255,255,0.35)"/>
</svg>`;
}