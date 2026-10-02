/**
 * Netlify Function (v2) 진입점: Express 앱 전체를 하나의 서버리스 함수로 실행합니다.
 * - 데이터와 업로드 이미지는 Netlify Blobs 에 저장됩니다 (STORAGE=blobs).
 * - preferStatic: public/ 의 정적 파일(css, js, 이미지)은 CDN 이 먼저 제공합니다.
 */
import serverless from 'serverless-http';
import app from '../../server.js';
// 앱 내부에서 require 하는 패키지를 Netlify 번들 추적기가 포함하도록 명시
import 'express';
import 'ejs';
import 'multer';
import '@netlify/blobs';

// 저장소 선택은 첫 요청 시점에 이뤄지므로 import 이후에 설정해도 됩니다.
process.env.STORAGE ||= 'blobs';

const handler = serverless(app, { binary: ['image/*', 'application/octet-stream'] });

export default async (req, context) => {
  const url = new URL(req.url);
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : null;
  const headers = Object.fromEntries(req.headers);
  headers.host ||= url.host;
  headers['x-forwarded-proto'] = url.protocol.replace(':', '');
  if (context?.ip) headers['x-forwarded-for'] = context.ip;

  const multiQuery = {};
  for (const [k, v] of url.searchParams) (multiQuery[k] ||= []).push(v);

  const res = await handler(
    {
      httpMethod: req.method,
      path: url.pathname,
      headers,
      multiValueHeaders: {},
      queryStringParameters: Object.fromEntries(url.searchParams),
      multiValueQueryStringParameters: multiQuery,
      body: body ? body.toString('base64') : null,
      isBase64Encoded: Boolean(body),
    },
    {}
  );

  const out = new Headers();
  for (const [k, v] of Object.entries(res.headers || {})) out.set(k, String(v));
  for (const [k, list] of Object.entries(res.multiValueHeaders || {})) {
    out.delete(k);
    for (const v of list) out.append(k, String(v));
  }
  const payload = res.isBase64Encoded ? Buffer.from(res.body, 'base64') : res.body;
  return new Response([204, 304].includes(res.statusCode) ? null : payload, { status: res.statusCode, headers: out });
};

export const config = {
  path: '/*',
  preferStatic: true,
};
