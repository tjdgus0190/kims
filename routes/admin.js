'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const store = require('../lib/store');
const auth = require('../lib/auth');
const backend = require('../lib/backend');

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'image/gif': '.gif' };
const toArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const toPrice = (v) => {
  const n = Number(String(v || '').replace(/[^0-9]/g, ''));
  return n > 0 ? n : null;
};

const SETTING_FIELDS = [
  'brandName', 'brandNameEn', 'awardBadge', 'awardTitle', 'awardCategory', 'awardYears', 'ceoName', 'phone', 'email', 'address', 'businessNumber', 'hours', 'kakaoUrl',
  'instagramUrl', 'heroEyebrow', 'heroTitle', 'heroSubtitle', 'storyTitle', 'storyText',
  'categoryNotes', 'metaTitle', 'metaDescription', 'metaKeywords', 'naverVerification', 'googleVerification',
];

// Netlify 함수는 요청 1건당 최대 6MB 이므로 서버리스 환경에서는 한도를 낮춥니다.
const MAX_FILE = process.env.STORAGE === 'blobs' || process.env.NETLIFY ? 4.5 * 1024 * 1024 : 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE, files: 20 },
  fileFilter: (req, file, cb) => cb(null, Boolean(IMAGE_TYPES[file.mimetype])),
});

async function saveUploads(files = []) {
  const urls = [];
  for (const f of files) {
    const key = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${IMAGE_TYPES[f.mimetype]}`;
    await backend.putImage(key, f.buffer, f.mimetype);
    urls.push('/uploads/' + key);
  }
  return urls;
}

const removeUpload = (url) => {
  if (!url?.startsWith('/uploads/')) return;
  backend.deleteImage(path.basename(url)).catch(() => {});
};

const router = express.Router();
router.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

/* ---------- 로그인 ---------- */
router.get('/login', (req, res) => {
  res.render('admin/login', { error: req.query.error, enabled: auth.enabled });
});

router.post('/login', (req, res) => {
  if (auth.tooManyAttempts(req.ip)) return res.redirect('/admin/login?error=limit');
  if (!auth.checkPassword(req.ip, req.body.password)) return res.redirect('/admin/login?error=1');
  auth.login(res);
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  auth.logout(res);
  res.redirect('/admin/login');
});

/* ---------- 아래부터 로그인 필요 ---------- */
router.use(auth.requireAdmin);
router.use((req, res, next) => {
  res.locals.newCount = store.listInquiries().filter((q) => q.status === 'new').length;
  next();
});

router.get('/', (req, res) => {
  res.render('admin/dashboard', { products: store.listProducts({ includeHidden: true }), saved: req.query.saved });
});

/* ---------- 상품 ---------- */
router.get('/products/new', (req, res) => {
  res.render('admin/product-form', { product: { visible: true, images: [] }, categories: store.categories() });
});

router.get('/products/:id', (req, res, next) => {
  const product = store.getProduct(req.params.id);
  if (!product) return next();
  res.render('admin/product-form', { product, categories: store.categories() });
});

/** 기존 이미지 중 남길 것 정리 + 새 업로드 저장 (대표 사진 / 상세 이미지 공통) */
async function mergeImages(keptInput, before = [], files = []) {
  const kept = toArray(keptInput).filter((u) => before.includes(u));
  before.filter((u) => !kept.includes(u)).forEach(removeUpload);
  return [...kept, ...(await saveUploads(files))];
}

const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'detailImages', maxCount: 10 },
]);

async function productFromBody(req, existing = {}) {
  const b = req.body;
  const files = req.files || {};
  const images = await mergeImages(b.existingImages, existing.images, files.images);
  const detailImages = await mergeImages(b.existingDetailImages, existing.detailImages, files.detailImages);
  return {
    name: String(b.name || '').trim(),
    slug: String(b.slug || '').trim(),
    brand: String(b.brand || '').trim(),
    category: String(b.category || '').trim(),
    capacity: String(b.capacity || '').trim(),
    badge: String(b.badge || '').trim(),
    summary: String(b.summary || '').trim(),
    description: String(b.description || '').trim(),
    howToUse: String(b.howToUse || '').trim(),
    ingredients: String(b.ingredients || '').trim(),
    price: toPrice(b.price),
    highlights: String(b.highlights || '').trim(),
    featured: b.featured === 'on',
    visible: b.visible === 'on',
    images,
    detailImages,
  };
}

router.post('/products', uploadFields, auth.verifyCsrf, async (req, res) => {
  const data = await productFromBody(req);
  if (!data.name) return res.status(400).send('상품명을 입력해 주세요.');
  await store.createProduct(data);
  res.redirect('/admin?saved=1');
});

router.post('/products/:id', uploadFields, auth.verifyCsrf, async (req, res, next) => {
  const product = store.getProduct(req.params.id);
  if (!product) return next();
  const data = await productFromBody(req, product);
  if (!data.name) return res.status(400).send('상품명을 입력해 주세요.');
  await store.updateProduct(product.id, data);
  res.redirect('/admin?saved=1');
});

router.post('/products/:id/delete', auth.verifyCsrf, async (req, res) => {
  const product = await store.deleteProduct(req.params.id);
  [...(product?.images || []), ...(product?.detailImages || [])].forEach(removeUpload);
  res.redirect('/admin?saved=deleted');
});

router.post('/products/:id/move', auth.verifyCsrf, async (req, res) => {
  await store.moveProduct(req.params.id, req.body.dir);
  res.redirect('/admin');
});

router.post('/products/:id/toggle', auth.verifyCsrf, async (req, res) => {
  const p = store.getProduct(req.params.id);
  const field = req.body.field === 'featured' ? 'featured' : 'visible';
  if (p) await store.updateProduct(p.id, { [field]: !p[field] });
  res.redirect('/admin');
});

/* ---------- 문의 ---------- */
router.get('/inquiries', (req, res) => {
  const smsReady = Boolean(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SMS_FROM);
  res.render('admin/inquiries', { inquiries: store.listInquiries(), smsReady, smsTo: process.env.SMS_TO || store.settings.phone });
});

router.post('/inquiries/:id', auth.verifyCsrf, async (req, res) => {
  await store.updateInquiry(req.params.id, {
    status: req.body.status === 'done' ? 'done' : 'new',
    memo: String(req.body.memo || '').slice(0, 1000),
  });
  res.redirect('/admin/inquiries');
});

router.post('/inquiries/:id/delete', auth.verifyCsrf, async (req, res) => {
  await store.deleteInquiry(req.params.id);
  res.redirect('/admin/inquiries');
});

/* ---------- 사이트 설정 ---------- */
router.get('/settings', (req, res) => {
  res.render('admin/settings', { saved: req.query.saved });
});

router.post('/settings', auth.verifyCsrf, async (req, res) => {
  const patch = {};
  for (const key of SETTING_FIELDS) patch[key] = String(req.body[key] ?? '').trim();
  await store.updateSettings(patch);
  res.redirect('/admin/settings?saved=1');
});

module.exports = router;
