'use strict';
/**
 * 새 상담 신청 알림
 *  - 문자(SMS/LMS): 솔라피(SOLAPI) — SOLAPI_API_KEY, SOLAPI_API_SECRET, SMS_FROM 설정 시 발송
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
async function notifyInquiry(q, settings = {}) {
  const text = smsText(q, settings.brandName);
  const [sms, webhook] = await Promise.all([sendSms(text, settings.phone), sendWebhook(text)]);
  const status = (r) => (r.skipped ? 'off' : r.ok ? 'sent' : `failed: ${r.error}`);
  return { sms: status(sms), webhook: status(webhook) };
}

module.exports = { notifyInquiry, smsText, solapiAuth };
