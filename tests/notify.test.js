'use strict';
/**
 * 상담 신청 → 문자 알림 통합 테스트
 * 솔라피 대신 로컬 가짜 서버(SOLAPI_BASE_URL)를 띄워, 실제 서버에 상담 신청을 보내고
 * 문자 요청의 인증 헤더 · 받는 번호 · 내용 · 접수 기록을 확인합니다.
 *   node --test tests/notify.test.js
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const KEY = 'TESTKEY';
const SECRET = 'TESTSECRET';
const received = [];
let failNext = false;
let mock, app, dataDir;
const APP_PORT = 3477;

function waitFor(url, ms = 8000) {
  const end = Date.now() + ms;
  return new Promise((resolve, reject) => {
    (function tick() {
      http.get(url, (r) => { r.resume(); resolve(); }).on('error', () => {
        if (Date.now() > end) reject(new Error('server not up')); else setTimeout(tick, 150);
      });
    })();
  });
}

function postInquiry(fields) {
  const body = new URLSearchParams({ agree: 'on', back: '/contact', ...fields }).toString();
  return new Promise((resolve, reject) => {
    const req = http.request(
      { port: APP_PORT, path: '/inquiry', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { res.resume(); res.on('end', () => resolve(res)); }
    );
    req.on('error', reject);
    req.end(body);
  });
}

before(async () => {
  mock = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      received.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(raw || '{}') });
      if (failNext) {
        failNext = false;
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ errorCode: 'ValidationError', errorMessage: '발신번호 미등록' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ groupId: 'G1', messageId: 'M1', statusCode: '2000' }));
    });
  });
  await new Promise((r) => mock.listen(0, r));
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jc-notify-'));
  app = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      ADMIN_PASSWORD: 'x',
      DATA_DIR: dataDir,
      SOLAPI_BASE_URL: `http://127.0.0.1:${mock.address().port}`,
      SOLAPI_API_KEY: KEY,
      SOLAPI_API_SECRET: SECRET,
      SMS_FROM: '010-4030-5956',
    },
    stdio: 'ignore',
  });
  await waitFor(`http://127.0.0.1:${APP_PORT}/`);
});

after(() => {
  app?.kill();
  mock?.close();
});

const readDb = () => JSON.parse(fs.readFileSync(path.join(dataDir, 'db.json'), 'utf8'));

test('상담 신청 시 대표번호로 정리된 문자가 발송된다', async () => {
  const res = await postInquiry({
    name: '홍길동', phone: '010-1234-5678', message: '선물용으로 세트 구성 문의드려요',
    product: readDb().products[0].id, time: '저녁 (18–22시)',
  });
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/contact?sent=1#inquiry');
  assert.equal(received.length, 1);

  const { url, auth, body } = received[0];
  assert.equal(url, '/messages/v4/send');
  // 솔라피 인증: HMAC-SHA256(date + salt, secret)
  const m = auth.match(/^HMAC-SHA256 apiKey=(.+), date=(.+), salt=(.+), signature=([0-9a-f]{64})$/);
  assert.ok(m, auth);
  assert.equal(m[1], KEY);
  assert.equal(crypto.createHmac('sha256', SECRET).update(m[2] + m[3]).digest('hex'), m[4]);
  assert.ok(Math.abs(Date.now() - Date.parse(m[2])) < 60_000);

  assert.equal(body.message.to, '01040305956'); // 받는 번호: 사이트 대표번호
  assert.equal(body.message.from, '01040305956');
  const text = body.message.text;
  assert.match(text, /^\[인테라 상담신청\]/);
  assert.match(text, /성함: 홍길동/);
  assert.match(text, /연락처: 010-1234-5678/);
  assert.match(text, /관심제품: 인테라 에디션 펩타이드 보툴엑소 볼륨 에센스 프리미엄/);
  assert.match(text, /통화희망: 저녁/);
  assert.match(text, /문의: 선물용으로 세트 구성 문의드려요/);
  assert.match(text, /접수: \d{2}\. \d{2}\. \d{2}:\d{2}/);

  const saved = readDb().inquiries.find((q) => q.name === '홍길동');
  assert.equal(saved.notified.sms, 'sent');
});

test('문자 발송이 실패해도 상담 신청은 정상 접수된다', async () => {
  failNext = true;
  const res = await postInquiry({ name: '김실패', phone: '010-9999-0000' });
  assert.equal(res.headers.location, '/contact?sent=1#inquiry');
  const saved = readDb().inquiries.find((q) => q.name === '김실패');
  assert.ok(saved, '문의가 저장되어야 함');
  assert.match(saved.notified.sms, /^failed: 발신번호 미등록/);
});

test('입력이 잘못된 신청은 문자를 보내지 않는다', async () => {
  const before = received.length;
  const res = await postInquiry({ name: '', phone: '010' });
  assert.equal(res.headers.location, '/contact?sent=error#inquiry');
  assert.equal(received.length, before);
});
