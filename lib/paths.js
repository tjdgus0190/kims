'use strict';
/**
 * 프로젝트 루트 경로.
 * Netlify 함수로 번들되면 __dirname 이 달라지므로, views 폴더가 실제로 있는 위치를 찾아 사용합니다.
 */
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '..'),
  path.join(__dirname, '..', '..'), // Netlify 번들: netlify/functions/server.js
  process.env.LAMBDA_TASK_ROOT,
  process.cwd(),
  __dirname,
].filter(Boolean);

const ROOT = candidates.find((dir) => fs.existsSync(path.join(dir, 'views', 'index.ejs'))) || candidates[0];

module.exports = { ROOT };
