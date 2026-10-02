'use strict';
/**
 * 저장소 백엔드
 *  - STORAGE=blobs (Netlify 함수에서 자동 설정): Netlify Blobs 에 데이터·이미지 저장
 *  - 그 외: 로컬 파일 (data/db.json, uploads/)
 */
const fs = require('fs');
const path = require('path');

const { ROOT } = require('./paths');

/* ---------------- 로컬 파일 ---------------- */
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');

const fileBackend = {
  name: 'file',
  async readDb() {
    try {
      return JSON.parse(await fs.promises.readFile(DB_FILE, 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  },
  async writeDb(data) {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + '.tmp';
    await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.promises.rename(tmp, DB_FILE);
  },
  async putImage(key, buffer) {
    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(UPLOAD_DIR, key), buffer);
  },
  async getImage(key) {
    try {
      return { data: await fs.promises.readFile(path.join(UPLOAD_DIR, key)) };
    } catch {
      return null;
    }
  },
  async deleteImage(key) {
    await fs.promises.unlink(path.join(UPLOAD_DIR, key)).catch(() => {});
  },
};

/* ---------------- Netlify Blobs ---------------- */
function blobsBackend() {
  const { getStore } = require('@netlify/blobs');
  const site = () => getStore({ name: 'site', consistency: 'strong' });
  const uploads = () => getStore({ name: 'uploads', consistency: 'strong' });
  return {
    name: 'blobs',
    async readDb() {
      return (await site().get('db', { type: 'json' })) || null;
    },
    async writeDb(data) {
      await site().setJSON('db', data);
    },
    async putImage(key, buffer, contentType) {
      await uploads().set(key, buffer, { metadata: { contentType } });
    },
    async getImage(key) {
      const res = await uploads().getWithMetadata(key, { type: 'arrayBuffer' });
      return res ? { data: Buffer.from(res.data), contentType: res.metadata?.contentType } : null;
    },
    async deleteImage(key) {
      await uploads().delete(key);
    },
  };
}

/* 첫 사용 시점에 STORAGE 값을 보고 결정 (Netlify 함수가 import 이후에 설정해도 반영되도록) */
let current = null;
const pick = () => (current ||= process.env.STORAGE === 'blobs' ? blobsBackend() : fileBackend);

module.exports = {
  get name() {
    return pick().name;
  },
  readDb: (...a) => pick().readDb(...a),
  writeDb: (...a) => pick().writeDb(...a),
  putImage: (...a) => pick().putImage(...a),
  getImage: (...a) => pick().getImage(...a),
  deleteImage: (...a) => pick().deleteImage(...a),
};
