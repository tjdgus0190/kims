'use strict';
/**
 * 관리자 인증: 환경변수 ADMIN_PASSWORD 로 로그인하고, 서명된 쿠키로 세션을 유지합니다.
 */
const crypto = require('crypto');

const COOKIE = 'jc_admin';
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12시간
const PASSWORD = process.env.ADMIN_PASSWORD || '';
// 서버리스(여러 인스턴스)에서도 세션이 유지되도록 SESSION_SECRET 이 없으면 비밀번호에서 파생합니다.
const SECRET =
  process.env.SESSION_SECRET ||
  (PASSWORD ? crypto.createHash('sha256').update('jc-session:' + PASSWORD).digest('hex') : crypto.randomBytes(32).toString('hex'));

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[경고] ADMIN_PASSWORD 가 설정되지 않아 관리자 로그인이 비활성화되어 있습니다. .env 를 확인하세요.');
}

const sign = (value) => crypto.createHmac('sha256', SECRET).update(value).digest('base64url');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}

function readSession(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !safeEqual(sign(payload), sig)) return null;
  const expires = Number(payload);
  return expires > Date.now() ? { token: raw } : null;
}

/* 로그인 시도 제한 (IP 당 15분에 10회) */
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  attempts.set(ip, list);
  return list.length >= 10;
}

module.exports = {
  enabled: Boolean(PASSWORD),
  tooManyAttempts,
  checkPassword(ip, input) {
    if (!PASSWORD) return false;
    const ok = safeEqual(input || '', PASSWORD);
    if (!ok) attempts.set(ip, [...(attempts.get(ip) || []), Date.now()]);
    return ok;
  },
  login(res) {
    const payload = String(Date.now() + MAX_AGE_MS);
    res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production' || Boolean(process.env.NETLIFY) || process.env.STORAGE === 'blobs',
      maxAge: MAX_AGE_MS,
      path: '/',
    });
  },
  logout(res) {
    res.clearCookie(COOKIE, { path: '/' });
  },
  /** 관리자 페이지 보호 + CSRF 토큰 제공 */
  requireAdmin(req, res, next) {
    const session = readSession(req);
    if (!session) return res.redirect('/admin/login');
    res.locals.csrf = sign('csrf:' + session.token);
    req.adminSession = session;
    next();
  },
  verifyCsrf(req, res, next) {
    if (req.method === 'GET') return next();
    const expected = sign('csrf:' + req.adminSession.token);
    if (!safeEqual(req.body?._csrf || '', expected)) {
      return res.status(403).send('잘못된 요청입니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
    }
    next();
  },
  parseCookies,
};
