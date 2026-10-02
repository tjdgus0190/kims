'use strict';
/** 템플릿에서 공통으로 쓰는 도우미 */

const won = (n) => (n === null || n === undefined || n === '' ? '' : Number(n).toLocaleString('ko-KR') + '원');

/** 010-1234-5678 → 01012345678 (tel: 링크용) */
const telHref = (phone) => 'tel:' + String(phone || '').replace(/[^0-9+]/g, '');
const smsHref = (phone, body) =>
  'sms:' + String(phone || '').replace(/[^0-9+]/g, '') + (body ? '?body=' + encodeURIComponent(body) : '');

/** 한 줄에 하나씩(또는 쉼표로) 적은 텍스트를 배열로 — 주요 포인트, 수상 연도 */
const lines = (text, sep = /\n/) =>
  String(text || '')
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);

/** 줄바꿈이 있는 텍스트를 문단 배열로 */
const paragraphs = (text) =>
  String(text || '')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

function siteUrl(req) {
  return (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function helpers(req) {
  const base = siteUrl(req);
  return {
    won,
    telHref,
    smsHref,
    lines,
    paragraphs,
    siteUrl: base,
    absUrl: (p) => (/^https?:/.test(p || '') ? p : base + (p || '/')),
    productUrl: (p) => '/products/' + encodeURIComponent(p.slug),
    year: new Date().getFullYear(),
  };
}

module.exports = { helpers, won, telHref, siteUrl };
