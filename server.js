'use strict';
try {
  process.loadEnvFile?.('.env');
} catch {
  /* .env 파일이 없으면 환경변수만 사용 */
}

const path = require('path');
const express = require('express');
const store = require('./lib/store');
const backend = require('./lib/backend');
const { helpers } = require('./lib/view');
const { ROOT } = require('./lib/paths');

const app = express();
const PORT = process.env.PORT || 3000;

app.engine('ejs', require('ejs').__express);
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

const assetOpts = { maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0 };
app.use(express.static(path.join(ROOT, 'public'), assetOpts));
app.use('/vendor/gsap', express.static(path.join(ROOT, 'node_modules/gsap/dist'), assetOpts));
app.use('/vendor/lenis', express.static(path.join(ROOT, 'node_modules/lenis/dist'), assetOpts));

app.use(express.urlencoded({ extended: false, limit: '200kb' }));

/* 업로드 이미지 (로컬 폴더 또는 Netlify Blobs) */
const MIME = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif' };
app.get('/uploads/:key', async (req, res, next) => {
  const key = path.basename(req.params.key);
  const img = await backend.getImage(key);
  if (!img) return next();
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.type(img.contentType || MIME[path.extname(key)] || 'application/octet-stream').send(img.data);
});

/* 매 요청마다 최신 데이터를 읽음 (서버리스 인스턴스 간 데이터 일관성) */
app.use(async (req, res, next) => {
  await store.load();
  Object.assign(res.locals, helpers(req), { settings: store.settings, path: req.path });
  next();
});

app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/public'));

app.use((req, res) => {
  res.status(404).render('404', { seo: { title: '페이지를 찾을 수 없습니다', noindex: true } });
});

app.use((err, req, res, _next) => {
  console.error(err);
  const message = err.code === 'LIMIT_FILE_SIZE' ? '이미지 용량은 10MB 이하만 가능합니다.' : err.expose ? err.message : '일시적인 오류가 발생했습니다.';
  res.status(err.status || 500).send(message);
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`제이앤코슈 홈페이지 실행 중 → http://localhost:${PORT}`));
}

module.exports = app;
