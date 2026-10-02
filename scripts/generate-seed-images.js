'use strict';
/**
 * 초기(샘플) 상품 이미지를 SVG 일러스트로 생성합니다.
 * 실제 제품 사진은 관리자 페이지에서 업로드해 교체하세요.
 *   node scripts/generate-seed-images.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'seed');
fs.mkdirSync(OUT, { recursive: true });

const W = 800;
const H = 1000;

function defs(id, bg1, bg2, glass, liquid) {
  return `
  <defs>
    <radialGradient id="bg-${id}" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </radialGradient>
    <linearGradient id="glass-${id}" x1="0" x2="1">
      <stop offset="0" stop-color="${glass}" stop-opacity=".95"/>
      <stop offset=".18" stop-color="#fff" stop-opacity=".55"/>
      <stop offset=".32" stop-color="${glass}" stop-opacity=".9"/>
      <stop offset=".85" stop-color="${glass}" stop-opacity=".98"/>
      <stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient>
    <linearGradient id="liquid-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${liquid}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${liquid}" stop-opacity=".95"/>
    </linearGradient>
    <linearGradient id="gold-${id}" x1="0" x2="1">
      <stop offset="0" stop-color="#8a6a3f"/>
      <stop offset=".35" stop-color="#e9d3a8"/>
      <stop offset=".55" stop-color="#b8976a"/>
      <stop offset="1" stop-color="#6e5330"/>
    </linearGradient>
    <linearGradient id="cap-${id}" x1="0" x2="1">
      <stop offset="0" stop-color="#1c1a18"/>
      <stop offset=".3" stop-color="#4a4541"/>
      <stop offset="1" stop-color="#0f0e0d"/>
    </linearGradient>
    <filter id="soft-${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>`;
}

const shadow = (id, cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.14}" fill="#2a2018" opacity=".28" filter="url(#soft-${id})"/>`;

function label(x, y, w, title, sub, dark = true) {
  const c = dark ? '#2b241d' : '#f6efe4';
  return `
    <text x="${x + w / 2}" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${w * 0.12}" letter-spacing="${w * 0.02}" fill="${c}">Dr.PEPTI</text>
    <line x1="${x + w * 0.3}" x2="${x + w * 0.7}" y1="${y + w * 0.07}" y2="${y + w * 0.07}" stroke="${c}" stroke-opacity=".5" stroke-width="1.5"/>
    <text x="${x + w / 2}" y="${y + w * 0.17}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${w * 0.062}" letter-spacing="${w * 0.012}" fill="${c}" opacity=".85">${title}</text>
    <text x="${x + w / 2}" y="${y + w * 0.26}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${w * 0.05}" fill="${c}" opacity=".6">${sub}</text>`;
}

/** 스포이드 에센스 병 */
function dropper(id, cx, baseY, w, h, title, sub) {
  const x = cx - w / 2;
  const top = baseY - h;
  const neckW = w * 0.34;
  return `
  ${shadow(id, cx, baseY + 6, w * 0.62)}
  <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${w * 0.12}" fill="url(#glass-${id})"/>
  <rect x="${x + w * 0.06}" y="${top + h * 0.28}" width="${w * 0.88}" height="${h * 0.68}" rx="${w * 0.08}" fill="url(#liquid-${id})"/>
  <rect x="${x + w * 0.1}" y="${top + h * 0.06}" width="${w * 0.06}" height="${h * 0.82}" rx="${w * 0.03}" fill="#fff" opacity=".45"/>
  <rect x="${cx - neckW / 2}" y="${top - h * 0.1}" width="${neckW}" height="${h * 0.12}" rx="6" fill="url(#gold-${id})"/>
  <path d="M ${cx - neckW * 0.42} ${top - h * 0.1} L ${cx - neckW * 0.42} ${top - h * 0.32} Q ${cx} ${top - h * 0.48} ${cx + neckW * 0.42} ${top - h * 0.32} L ${cx + neckW * 0.42} ${top - h * 0.1} Z" fill="url(#cap-${id})"/>
  <rect x="${x + w * 0.14}" y="${top + h * 0.34}" width="${w * 0.72}" height="${h * 0.42}" rx="4" fill="#fbf7f0" opacity=".92"/>
  ${label(x + w * 0.14, top + h * 0.47, w * 0.72, title, sub)}`;
}

/** 펌프 병 */
function pump(id, cx, baseY, w, h, title, sub) {
  const x = cx - w / 2;
  const top = baseY - h;
  return `
  ${shadow(id, cx, baseY + 6, w * 0.7)}
  <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${w * 0.48}" ry="${w * 0.2}" fill="url(#glass-${id})"/>
  <rect x="${x + w * 0.12}" y="${top + h * 0.06}" width="${w * 0.07}" height="${h * 0.84}" rx="${w * 0.035}" fill="#fff" opacity=".5"/>
  <rect x="${cx - w * 0.26}" y="${top - h * 0.08}" width="${w * 0.52}" height="${h * 0.1}" rx="8" fill="url(#gold-${id})"/>
  <rect x="${cx - w * 0.07}" y="${top - h * 0.2}" width="${w * 0.14}" height="${h * 0.13}" fill="url(#cap-${id})"/>
  <path d="M ${cx - w * 0.2} ${top - h * 0.2} h ${w * 0.62} a ${w * 0.04} ${w * 0.04} 0 0 1 0 ${w * 0.08} h ${-w * 0.62} z" fill="url(#cap-${id})"/>
  ${label(x + w * 0.12, top + h * 0.38, w * 0.76, title, sub)}`;
}

/** 크림 자 */
function jar(id, cx, baseY, w, h, title, sub) {
  const x = cx - w / 2;
  const top = baseY - h;
  const lidH = h * 0.36;
  return `
  ${shadow(id, cx, baseY + 6, w * 0.6)}
  <rect x="${x}" y="${top + lidH}" width="${w}" height="${h - lidH}" rx="${w * 0.08}" fill="url(#glass-${id})"/>
  <rect x="${x + w * 0.06}" y="${top + lidH + 10}" width="${w * 0.04}" height="${(h - lidH) * 0.8}" rx="6" fill="#fff" opacity=".5"/>
  <rect x="${x - w * 0.02}" y="${top}" width="${w * 1.04}" height="${lidH}" rx="${w * 0.05}" fill="url(#gold-${id})"/>
  <rect x="${x - w * 0.02}" y="${top + lidH - 8}" width="${w * 1.04}" height="8" fill="#000" opacity=".15"/>
  ${label(x + w * 0.15, top + lidH + (h - lidH) * 0.36, w * 0.7, title, sub)}`;
}

function svg(id, colors, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
  ${defs(id, ...colors)}
  <rect width="${W}" height="${H}" fill="url(#bg-${id})"/>
  <circle cx="${W * 0.78}" cy="${H * 0.2}" r="170" fill="#fff" opacity=".22" filter="url(#soft-${id})"/>
  <circle cx="${W * 0.18}" cy="${H * 0.72}" r="120" fill="#fff" opacity=".14" filter="url(#soft-${id})"/>
  <rect x="0" y="${H * 0.8}" width="${W}" height="${H * 0.2}" fill="#000" opacity=".04"/>
  ${body}
</svg>
`;
}

const items = {
  'master-essence': svg('a', ['#f6eadb', '#d9c0a0', '#f3e2c7', '#d7a96b'], dropper('a', 400, 820, 280, 470, 'VOLUME MASTER', 'ESSENCE 3.0 · 105ml')),
  'volume-essence': svg('b', ['#f4ece6', '#cdb9ad', '#efe3db', '#c99f86'], dropper('b', 400, 820, 270, 450, 'VOLUME ESSENCE', '2.0 · 100ml')),
  'bubble-lifting': svg('c', ['#eef0f2', '#bfc4c9', '#f2f2f2', '#d8c9b3'], pump('c', 400, 820, 200, 470, 'BUBBLE LIFTING', 'PRO ESSENCE · 30ml')),
  'silk-cream': svg('d', ['#f7efe9', '#d4bfb4', '#f9f4ef', '#efe0d2'], jar('d', 400, 800, 360, 270, 'SILK LAYER', 'CREAM · 60ml')),
  'set-cream-essence': svg(
    'e',
    ['#f5ebe1', '#cdb39a', '#f3e5d6', '#cf9f74'],
    dropper('e', 290, 820, 220, 400, 'VOLUME', 'ESSENCE 2.0') + jar('e', 540, 830, 250, 190, 'SILK LAYER', 'CREAM')
  ),
  'master-set': svg(
    'f',
    ['#f3e8db', '#c9ac8a', '#f1dfc6', '#d6a466'],
    dropper('f', 230, 840, 150, 270, 'MASTER', '50ml') + dropper('f', 570, 840, 150, 270, 'MASTER', '50ml') + dropper('f', 400, 860, 230, 420, 'VOLUME MASTER', 'ESSENCE · 105ml')
  ),
};

for (const [name, content] of Object.entries(items)) {
  fs.writeFileSync(path.join(OUT, name + '.svg'), content);
  console.log('생성:', 'public/seed/' + name + '.svg');
}
