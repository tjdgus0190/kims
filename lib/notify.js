'use strict';
/**
 * 새 상담 신청 알림
 *  - 이메일(무료): 네이버 등 SMTP — SMTP_USER, SMTP_PASS 설정 시 발송 (받는 주소: 사이트 설정 notifyEmail)
 *  - 문자(SMS/LMS, 유료): 솔라피(SOLAPI) — SOLAPI_API_KEY, SOLAPI_API_SECRET, SMS_FROM 설정 시 발송
 *  - 웹훅(선택): INQUIRY_WEBHOOK_URL (슬랙/디스코드 등)
 *
 * 알림이 실패해도 상담 신청 접수는 정상 처리됩니다. (결과는 문의 기록에 남김)
 */
const crypto = require('crypto');

const SOLAPI_URL = (process.env.SOLAPI_BASE_URL || 'https://api.solapi.com') + '/messages/v4/send';
const digits = (s) => String(s || '').replace(/[^0-9]/g, '');

/** 솔라피 HMAC-SHA256 인증 헤더 */
function solapiAuth(apiKey, apiSecret, date = new Date().toISOString(), salt = crypto.randomBytes(16).toString('hex')) {
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 대표에게 보낼 문자 내용 (90바이트를 넘으면 솔라피가 자동으로 장문(LMS) 처리) */
function smsText(q, brand = '인테라') {
  const time = new Date(q.createdAt || Date.now()).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const msg = String(q.message || '').replace(/\s+/g, ' ').trim();
  return [
    `[${brand} 상담신청]`,
    `성함: ${q.name}`,
    `연락처: ${q.phone}`,
    q.productName && `관심제품: ${q.productName}`,
    q.preferredTime && `통화희망: ${q.preferredTime}`,
    msg && `문의: ${msg.length > 300 ? msg.slice(0, 300) + '…' : msg}`,
    `접수: ${time}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function sendSms(text, to) {
  const { SOLAPI_API_KEY: key, SOLAPI_API_SECRET: secret, SMS_FROM: from } = process.env;
  if (!key || !secret || !from) return { channel: 'sms', skipped: true };
  const recipients = String(process.env.SMS_TO || to || '')
    .split(',')
    .map(digits)
    .filter((n) => n.length >= 8);
  if (!recipients.length) return { channel: 'sms', ok: false, error: '받는 번호 없음' };

  const results = await Promise.all(
    recipients.map(async (number) => {
      try {
        const res = await fetch(SOLAPI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: solapiAuth(key, secret) },
          body: JSON.stringify({ message: { to: number, from: digits(from), text } }),
          signal: AbortSignal.timeout(5000),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.errorMessage || body.errorCode || `HTTP ${res.status}`);
        return { to: number, ok: true };
      } catch (e) {
        console.error('[문자 알림 실패]', number, e.message);
        return { to: number, ok: false, error: e.message };
      }
    })
  );
  const failed = results.filter((r) => !r.ok);
  return { channel: 'sms', ok: failed.length === 0, error: failed.map((f) => f.error).join(', ') || undefined };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** 상담 신청 메일 본문 (메일 앱에서 깨지지 않도록 표 + 인라인 스타일) */
function emailHtml(q, { brand = '인테라', siteUrl = '' } = {}) {
  const time = new Date(q.createdAt || Date.now()).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const row = (k, v) =>
    v ? `<tr><th style="text-align:left;padding:12px 16px;width:96px;color:#6b6259;font-weight:500;border-bottom:1px solid #ece3d6;vertical-align:top">${k}</th><td style="padding:12px 16px;border-bottom:1px solid #ece3d6;color:#1b1815">${v}</td></tr>` : '';
  const tel = String(q.phone || '').replace(/[^0-9+]/g, '');
  return `<!doctype html><html><body style="margin:0;background:#f6f1ea;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ea;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:6px;overflow:hidden">
<tr><td style="background:#15120f;padding:22px 24px;color:#e8d6b5;font-family:Georgia,serif;font-size:22px;letter-spacing:4px">${esc(brand === '인테라' ? 'INTERRA' : brand)}<div style="font-family:sans-serif;font-size:13px;letter-spacing:0;color:#c9a978;margin-top:6px">새 상담 신청이 접수되었습니다</div></td></tr>
<tr><td style="padding:8px 8px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6;word-break:keep-all">
${row('성함', esc(q.name))}
${row('연락처', `<a href="tel:${esc(tel)}" style="color:#a8824f;font-weight:600;text-decoration:none">${esc(q.phone)}</a>`)}
${row('관심 제품', esc(q.productName))}
${row('통화 희망', esc(q.preferredTime))}
${row('문의 내용', esc(q.message).replace(/\n/g, '<br>'))}
${row('접수 시각', esc(time))}
</table></td></tr>
<tr><td style="padding:20px 24px 28px">
<a href="tel:${esc(tel)}" style="display:inline-block;background:#15120f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:99px;font-size:14px">고객에게 전화하기</a>
${siteUrl ? `<a href="${esc(siteUrl)}/admin/inquiries" style="display:inline-block;margin-left:8px;color:#1b1815;text-decoration:none;padding:12px 18px;border:1px solid #ece3d6;border-radius:99px;font-size:14px">관리자에서 보기</a>` : ''}
</td></tr></table>
<p style="font-size:12px;color:#8a8178;margin:16px 0 0">홈페이지 상담 신청 폼에서 자동 발송된 메일입니다.</p>
</td></tr></table></body></html>`;
}

async function sendEmail(q, text, { brand, siteUrl, to }) {
  const { SMTP_USER: user, SMTP_PASS: pass } = process.env;
  if (!user || !pass) return { channel: 'email', skipped: true };
  const host = process.env.SMTP_HOST || 'smtp.naver.com';
  const port = Number(process.env.SMTP_PORT || 465);
  // 네이버 SMTP 는 보내는 주소가 로그인 계정과 같아야 합니다.
  const from = user.includes('@') ? user : `${user}@${host.includes('naver') ? 'naver.com' : host.replace(/^smtp\./, '')}`;
  const recipients = String(to || process.env.MAIL_TO || from).split(',').map((s) => s.trim()).filter(Boolean);
  try {
    const nodemailer = require('nodemailer');
    const transport = nodemailer.createTransport({
      host, port, secure: port === 465, auth: { user, pass },
      connectionTimeout: 6000, greetingTimeout: 6000, socketTimeout: 8000,
      tls: process.env.SMTP_INSECURE_TLS === '1' ? { rejectUnauthorized: false } : undefined, // 테스트 전용
    });
    await transport.sendMail({
      from: `"${brand} 홈페이지" <${from}>`,
      to: recipients.join(', '),
      subject: `[${brand}] 새 상담 신청 · ${q.name} (${q.phone})${q.productName ? ' · ' + q.productName : ''}`,
      text,
      html: emailHtml(q, { brand, siteUrl }),
    });
    return { channel: 'email', ok: true };
  } catch (e) {
    console.error('[메일 알림 실패]', e.message);
    return { channel: 'email', ok: false, error: e.message };
  }
}

async function sendWebhook(text) {
  const url = process.env.INQUIRY_WEBHOOK_URL;
  if (!url) return { channel: 'webhook', skipped: true };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { channel: 'webhook', ok: true };
  } catch (e) {
    console.error('[웹훅 알림 실패]', e.message);
    return { channel: 'webhook', ok: false, error: e.message };
  }
}

/**
 * 새 문의 알림 발송. 서버리스 환경은 응답 후 실행이 멈출 수 있으므로 발송 완료를 기다립니다.
 * @returns {{ sms: string, webhook: string }} 'sent' | 'failed: …' | 'off'
 */
async function notifyInquiry(q, settings = {}, { siteUrl = '' } = {}) {
  const brand = settings.brandName || '인테라';
  const text = smsText(q, brand);
  const [email, sms, webhook] = await Promise.all([
    sendEmail(q, text, { brand, siteUrl, to: settings.notifyEmail }),
    sendSms(text, settings.phone),
    sendWebhook(text),
  ]);
  const status = (r) => (r.skipped ? 'off' : r.ok ? 'sent' : `failed: ${r.error}`);
  return { email: status(email), sms: status(sms), webhook: status(webhook) };
}

/** 관리자 화면 안내용: 어떤 알림이 켜져 있는지 */
const channels = () => ({
  email: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
  sms: Boolean(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SMS_FROM),
});

module.exports = { notifyInquiry, smsText, solapiAuth, emailHtml, channels };
