'use strict';
/**
 * 아주 작은 JSON 저장소 (상품 · 문의 · 사이트 설정).
 *
 * 저장 위치는 환경에 따라 자동으로 결정됩니다.
 *  - 로컬 / 일반 서버: data/db.json 파일
 *  - Netlify: Netlify Blobs (서버리스 환경에서도 영구 보존)
 *
 * 서버리스 환경은 요청마다 다른 인스턴스가 처리할 수 있으므로,
 * 요청 시작 시 load() 로 최신 데이터를 읽고, 변경 시 즉시 저장합니다.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const backend = require('./backend');

const SEED_FILE = path.join(require('./paths').ROOT, 'data', 'seed.json');

const SEED_VERSION = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8')).seedVersion || 1;

let db = null;

function seedDb() {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  const now = new Date().toISOString();
  seed.products = seed.products.map((p, i) => ({
    id: newId(),
    order: i,
    visible: true,
    createdAt: now,
    updatedAt: now,
    ...p,
  }));
  seed.inquiries = [];
  return seed;
}

async function load() {
  let data = await backend.readDb();
  if (!data) {
    data = seedDb();
    await backend.writeDb(data);
  } else {
    // seed.json 의 seedVersion 이 올라가면 상품·사이트 문구를 새 초기 데이터로 교체합니다. (고객 문의는 유지)
    if ((data.seedVersion || 1) < SEED_VERSION) {
      const seed = seedDb();
      data = { ...data, seedVersion: seed.seedVersion, products: seed.products, settings: { ...data.settings, ...seed.settings } };
      await backend.writeDb(data);
    }
  }
  data.products ||= [];
  data.inquiries ||= [];
  data.settings ||= {};
  db = data;
  return db;
}

async function save() {
  await backend.writeDb(db);
}

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

/** 한글을 유지하는 URL 슬러그 */
function slugify(text) {
  return (
    String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || newId()
  );
}

function uniqueSlug(base, exceptId) {
  let slug = slugify(base);
  let n = 2;
  while (db.products.some((p) => p.slug === slug && p.id !== exceptId)) {
    slug = `${slugify(base)}-${n++}`;
  }
  return slug;
}

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

module.exports = {
  load,
  get settings() {
    return db.settings;
  },
  async updateSettings(patch) {
    Object.assign(db.settings, patch);
    await save();
  },

  listProducts({ includeHidden = false } = {}) {
    return db.products.filter((p) => includeHidden || p.visible).sort(byOrder);
  },
  categories() {
    return [...new Set(this.listProducts().map((p) => p.category).filter(Boolean))];
  },
  getProduct(id) {
    return db.products.find((p) => p.id === id);
  },
  getProductBySlug(slug) {
    return db.products.find((p) => p.slug === slug && p.visible);
  },
  async createProduct(data) {
    const now = new Date().toISOString();
    const product = {
      id: newId(),
      order: db.products.length ? Math.max(...db.products.map((p) => p.order ?? 0)) + 1 : 0,
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    product.slug = uniqueSlug(data.slug || data.name, product.id);
    db.products.push(product);
    await save();
    return product;
  },
  async updateProduct(id, data) {
    const product = this.getProduct(id);
    if (!product) return null;
    Object.assign(product, data, { updatedAt: new Date().toISOString() });
    product.slug = uniqueSlug(data.slug || product.slug || product.name, id);
    await save();
    return product;
  },
  async deleteProduct(id) {
    const product = this.getProduct(id);
    db.products = db.products.filter((p) => p.id !== id);
    await save();
    return product;
  },
  async moveProduct(id, dir) {
    const list = db.products.sort(byOrder);
    const i = list.findIndex((p) => p.id === id);
    const j = i + (dir === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((p, k) => (p.order = k));
    await save();
  },

  listInquiries() {
    return [...db.inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async addInquiry(data) {
    const inquiry = { id: newId(), status: 'new', createdAt: new Date().toISOString(), ...data };
    db.inquiries.push(inquiry);
    await save();
    return inquiry;
  },
  async updateInquiry(id, patch) {
    const inquiry = db.inquiries.find((q) => q.id === id);
    if (inquiry) {
      Object.assign(inquiry, patch);
      await save();
    }
    return inquiry;
  },
  async deleteInquiry(id) {
    db.inquiries = db.inquiries.filter((q) => q.id !== id);
    await save();
  },
};
