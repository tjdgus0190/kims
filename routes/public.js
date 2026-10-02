'use strict';
const express = require('express');
const store = require('../lib/store');
const { won } = require('../lib/view');
const { notifyInquiry } = require('../lib/notify');

const router = express.Router();

/* 문의 도배 방지 (IP 당 10분에 5건) */
const recent = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.set(ip, list);
  if (list.length >= 5) return true;
  list.push(now);
  return false;
}

function organizationLd(res) {
  const s = store.settings;
  const base = res.locals.siteUrl;
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: s.brandName,
    alternateName: s.brandNameEn,
    openingHours: 'Mo-Su 00:00-23:59',
    url: base + '/',
    telephone: s.phone,
    image: base + '/img/og-image.png',
    address: s.address ? { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'KR' } : undefined,
    description: s.metaDescription,
  };
}

function productLd(res, p) {
  const base = res.locals.siteUrl;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: (p.images || []).map((i) => res.locals.absUrl(i)),
    description: p.summary,
    brand: { '@type': 'Brand', name: p.brand || store.settings.brandName },
    url: base + res.locals.productUrl(p),
    offers: p.price
      ? {
          '@type': 'Offer',
          priceCurrency: 'KRW',
          price: p.price,
          availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: store.settings.brandName },
        }
      : undefined,
  };
}

router.get('/', (req, res) => {
  const products = store.listProducts();
  const featured = products.filter((p) => p.featured);
  res.render('index', {
    products,
    featured: featured.length ? featured : products.slice(0, 4),
    sent: req.query.sent,
    seo: { jsonLd: [organizationLd(res)] },
  });
});

router.get('/products', (req, res) => {
  const category = req.query.category || '';
  const all = store.listProducts();
  const products = category ? all.filter((p) => p.category === category) : all;
  res.render('products', {
    products,
    categories: store.categories(),
    category,
    seo: {
      title: category ? `${category} 제품` : '제품 안내',
      description: `${store.settings.brandName} 제품 안내 — ${all.map((p) => p.name).slice(0, 5).join(', ')}. 구매는 대표번호 ${store.settings.phone} 로 문의해 주세요.`,
    },
  });
});

router.get('/products/:slug', (req, res, next) => {
  const product = store.getProductBySlug(req.params.slug);
  if (!product) return next();
  const others = store.listProducts().filter((p) => p.id !== product.id).slice(0, 4);
  res.render('product', {
    product,
    others,
    sent: req.query.sent,
    seo: {
      title: product.name,
      description: [product.summary, product.price ? `가격 ${won(product.price)}` : '', `구매 문의 ${store.settings.phone}`]
        .filter(Boolean)
        .join(' · '),
      image: product.images?.[0],
      type: 'product',
      jsonLd: [productLd(res, product)],
    },
  });
});

router.get('/catalog', (req, res) => {
  const products = store.listProducts();
  const groups = [];
  for (const p of products) {
    const key = p.category || '기타';
    let g = groups.find((x) => x.name === key);
    if (!g) groups.push((g = { name: key, items: [] }));
    g.items.push(p);
  }
  res.render('catalog', {
    groups,
    total: products.length,
    seo: {
      title: `${store.settings.brandName || ''} 제품 카탈로그`.trim(),
      description: `${store.settings.brandName} ${store.settings.brandName || ''} 제품 카탈로그 — 전 제품 소비자가와 주요 특징을 한눈에. 구매 문의 ${store.settings.phone}`,
    },
  });
});

router.get('/contact', (req, res) => {
  res.render('contact', {
    products: store.listProducts(),
    selected: req.query.product || '',
    sent: req.query.sent,
    seo: { title: '구매 · 상담 문의', description: `${store.settings.brandName} 제품 구매 및 상담 문의. 대표번호 ${store.settings.phone}` },
  });
});

router.post('/inquiry', async (req, res) => {
  const back = (req.body.back || '/contact').startsWith('/') ? req.body.back.split('?')[0] : '/contact';
  // honeypot: 사람에게는 보이지 않는 필드가 채워져 있으면 봇
  if (req.body.website) return res.redirect(back + '?sent=1#inquiry');
  const name = String(req.body.name || '').trim().slice(0, 40);
  const phone = String(req.body.phone || '').trim().slice(0, 30);
  const message = String(req.body.message || '').trim().slice(0, 2000);
  const product = store.getProduct(String(req.body.product || ''));
  if (!name || !/^[0-9+\-\s()]{8,}$/.test(phone) || req.body.agree !== 'on') {
    return res.redirect(back + '?sent=error#inquiry');
  }
  if (rateLimited(req.ip)) return res.redirect(back + '?sent=limit#inquiry');
  const inquiry = await store.addInquiry({
    name,
    phone,
    message,
    productId: product?.id || '',
    productName: product?.name || '',
    preferredTime: String(req.body.time || '').slice(0, 40),
  });
  // 대표 휴대폰 문자(솔라피) · 웹훅 알림 — 실패해도 접수는 완료, 결과는 문의 기록에 남김
  const notified = await notifyInquiry(inquiry, store.settings, { siteUrl: res.locals.siteUrl });
  await store.updateInquiry(inquiry.id, { notified });
  res.redirect(back + '?sent=1#inquiry');
});


router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${res.locals.siteUrl}/sitemap.xml\n`);
});

router.get('/sitemap.xml', (req, res) => {
  const base = res.locals.siteUrl;
  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/products', priority: '0.9' },
    { loc: '/catalog', priority: '0.9' },
    { loc: '/contact', priority: '0.7' },
    ...store.listProducts().map((p) => ({ loc: res.locals.productUrl(p), lastmod: p.updatedAt, priority: '0.8' })),
  ];
  const xml = urls
    .map(
      (u) =>
        `  <url><loc>${base}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
    )
    .join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xml}\n</urlset>\n`);
});

module.exports = router;
