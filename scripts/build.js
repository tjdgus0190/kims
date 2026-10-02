'use strict';
/**
 * 빌드: 모션 라이브러리(GSAP, Lenis)를 public/vendor 로 복사합니다.
 * (Netlify 는 public/ 폴더를 정적 파일로 배포하므로 node_modules 를 직접 제공할 수 없음)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const copies = [
  ['node_modules/gsap/dist/gsap.min.js', 'public/vendor/gsap/gsap.min.js'],
  ['node_modules/gsap/dist/ScrollTrigger.min.js', 'public/vendor/gsap/ScrollTrigger.min.js'],
  ['node_modules/lenis/dist/lenis.min.js', 'public/vendor/lenis/lenis.min.js'],
  ['node_modules/lenis/dist/lenis.css', 'public/vendor/lenis/lenis.css'],
];

for (const [from, to] of copies) {
  fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(root, to));
  console.log('복사:', to);
}
