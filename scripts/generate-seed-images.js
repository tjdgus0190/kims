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

let BRAND = 'INTERRA';
function label(x, y, w, title, sub, dark = true) {
  const c = dark ? '#2b241d' : '#ead9b8';
  return `
    <text x="${x + w / 2}" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${w * 0.11}" letter-spacing="${w * 0.025}" fill="${c}">${BRAND}</text>
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

/** 토너: 길고 가는 병 + 둥근 캡 */
function toner(id, cx, baseY, w, h, title, sub) {
  const x = cx - w / 2;
  const top = baseY - h;
  return `
  ${shadow(id, cx, baseY + 6, w * 0.7)}
  <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${w * 0.16}" fill="url(#glass-${id})"/>
  <rect x="${x + w * 0.05}" y="${top + h * 0.2}" width="${w * 0.9}" height="${h * 0.76}" rx="${w * 0.12}" fill="url(#liquid-${id})"/>
  <rect x="${x + w * 0.1}" y="${top + h * 0.05}" width="${w * 0.07}" height="${h * 0.86}" rx="${w * 0.035}" fill="#fff" opacity=".5"/>
  <rect x="${cx - w * 0.36}" y="${top - h * 0.2}" width="${w * 0.72}" height="${h * 0.22}" rx="${w * 0.1}" fill="url(#gold-${id})"/>
  <rect x="${x + w * 0.12}" y="${top + h * 0.34}" width="${w * 0.76}" height="${h * 0.36}" rx="4" fill="#fbf7f0" opacity=".93"/>
  ${label(x + w * 0.12, top + h * 0.46, w * 0.76, title, sub)}`;
}

/** 쿠션 팩트: 비스듬히 본 원형 케이스 (열린 뚜껑 + 퍼프) */
function pact(id, cx, baseY, r, title, sub) {
  const ry = r * 0.42;
  const lidY = baseY - r * 1.25;
  return `
  ${shadow(id, cx, baseY + 10, r * 1.05)}
  <ellipse cx="${cx}" cy="${lidY}" rx="${r}" ry="${r * 0.86}" fill="url(#gold-${id})"/>
  <ellipse cx="${cx}" cy="${lidY}" rx="${r * 0.86}" ry="${r * 0.73}" fill="#e9e3dc"/>
  <ellipse cx="${cx}" cy="${lidY}" rx="${r * 0.8}" ry="${r * 0.67}" fill="#fff" opacity=".55"/>
  <path d="M ${cx - r} ${baseY - r * 0.28} v ${r * 0.28} a ${r} ${ry} 0 0 0 ${r * 2} 0 v ${-r * 0.28} z" fill="url(#cap-${id})"/>
  <ellipse cx="${cx}" cy="${baseY - r * 0.28}" rx="${r}" ry="${ry}" fill="url(#gold-${id})"/>
  <ellipse cx="${cx}" cy="${baseY - r * 0.28}" rx="${r * 0.82}" ry="${ry * 0.8}" fill="url(#liquid-${id})"/>
  <ellipse cx="${cx - r * 0.25}" cy="${baseY - r * 0.36}" rx="${r * 0.3}" ry="${ry * 0.22}" fill="#fff" opacity=".35"/>
  <text x="${cx}" y="${lidY - r * 0.05}" text-anchor="middle" font-family="Georgia, serif" font-size="${r * 0.2}" letter-spacing="${r * 0.04}" fill="#2b241d">${BRAND}</text>
  <text x="${cx}" y="${lidY + r * 0.15}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${r * 0.085}" letter-spacing="${r * 0.02}" fill="#2b241d" opacity=".75">${title}</text>
  <text x="${cx}" y="${lidY + r * 0.29}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${r * 0.075}" fill="#2b241d" opacity=".55">${sub}</text>`;
}

/** 살롱 라인: 짙은 색 펌프/튜브 병 (밝은 라벨 글씨) */
function salon(id, cx, baseY, w, h, title, sub, kind = 'pump') {
  const x = cx - w / 2;
  const top = baseY - h;
  const head =
    kind === 'pump'
      ? `<rect x="${cx - w * 0.22}" y="${top - h * 0.07}" width="${w * 0.44}" height="${h * 0.09}" rx="6" fill="url(#gold-${id})"/>
  <rect x="${cx - w * 0.06}" y="${top - h * 0.17}" width="${w * 0.12}" height="${h * 0.11}" fill="#111"/>
  <path d="M ${cx - w * 0.16} ${top - h * 0.17} h ${w * 0.5} a ${w * 0.035} ${w * 0.035} 0 0 1 0 ${w * 0.07} h ${-w * 0.5} z" fill="#111"/>`
      : kind === 'dropper'
        ? `<rect x="${cx - w * 0.2}" y="${top - h * 0.1}" width="${w * 0.4}" height="${h * 0.12}" rx="6" fill="url(#gold-${id})"/>
  <path d="M ${cx - w * 0.16} ${top - h * 0.1} L ${cx - w * 0.16} ${top - h * 0.3} Q ${cx} ${top - h * 0.44} ${cx + w * 0.16} ${top - h * 0.3} L ${cx + w * 0.16} ${top - h * 0.1} Z" fill="#111"/>`
        : '';
  return `
  ${shadow(id, cx, baseY + 6, w * 0.7)}
  <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${kind === 'jar' ? w * 0.08 : w * 0.18}" fill="url(#cap-${id})"/>
  <rect x="${x + w * 0.1}" y="${top + h * 0.05}" width="${w * 0.05}" height="${h * 0.86}" rx="${w * 0.025}" fill="#fff" opacity=".18"/>
  ${head}
  <rect x="${x + w * 0.14}" y="${top + h * 0.28}" width="${w * 0.72}" height="1.5" fill="#c9a978" opacity=".7"/>
  ${label(x + w * 0.1, top + h * 0.4, w * 0.8, title, sub, false)}
  <rect x="${x + w * 0.14}" y="${top + h * 0.62}" width="${w * 0.72}" height="1.5" fill="#c9a978" opacity=".7"/>`;
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
  'interra-essence': svg('a', ['#f4e7d4', '#cfae84', '#f3e2c7', '#d9a65f'], pump('a', 400, 830, 230, 500, 'BOTULEXO VOLUME', 'ESSENCE PREMIUM')),
  'interra-cream': svg('b', ['#f6ede6', '#cfb6a6', '#f9f4ef', '#efe0d2'], jar('b', 400, 800, 380, 280, 'BOTULEXO', 'CREAM PREMIUM')),
  'interra-toner': svg('c', ['#f5ebe8', '#d4b8b0', '#f4e6e2', '#e6c4b8'], toner('c', 400, 830, 220, 470, 'BOTULEXO', 'TONER PREMIUM')),
  'interra-pact': svg('d', ['#f6ece6', '#d2b3a2', '#f3e2d8', '#e9c9a8'], pact('d', 400, 800, 210, 'WATER GLOW COVER', 'ESSENCE PACT · SPF50+')),
  'interra-shampoo': svg('e', ['#ece6de', '#b5a796', '#e8e1d8', '#3a332c'], salon('e', 400, 840, 230, 520, '100K SALON', 'SHAMPOO', 'pump')),
  'interra-hairmask': svg('f', ['#ede6dc', '#b7a690', '#e8e1d8', '#3a332c'], salon('f', 400, 820, 360, 300, '100K SALON', 'HAIR MASK', 'jar')),
  'interra-hairserum': svg('g', ['#eee7de', '#baa993', '#e8e1d8', '#3a332c'], salon('g', 400, 840, 200, 380, '100K SALON', 'HAIR SERUM', 'dropper')),
};

for (const [name, content] of Object.entries(items)) {
  fs.writeFileSync(path.join(OUT, name + '.svg'), content);
  console.log('생성:', 'public/seed/' + name + '.svg');
}
