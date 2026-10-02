# 인테라(INTERRA) 홈페이지 — 작업 가이드

**인테라(INTERRA)** 제품 카탈로그 홈페이지 (대표번호 010-4030-5956, 24시간 문의). **결제 기능 없음, 가격은 소비자가만 표시, 구매는 전화 문의.**
- 사이트 상호 표기는 INTERRA / 인테라. 하단에 상호·대표자·상담시간 같은 사업자 정보는 표시하지 않음 (요청사항).
- 제품 32종(7개 라인)은 공식 이미지(public/products, 썸네일 + 상세 이미지)와 상세 이미지 OCR 내용으로 구성.

## 명령어
- `npm run dev` — 로컬 서버 (http://localhost:3000, `.env` 의 ADMIN_PASSWORD 필요)
- `npm test` — Playwright QA 테스트 (PC + 모바일)
- `npm run build` — 모션 라이브러리를 public/vendor 로 복사 (Netlify 빌드 명령)

## 구조
- `server.js` Express 앱 / `routes/public.js`, `routes/admin.js`
- `lib/store.js` 데이터(상품·문의·설정), `lib/backend.js` 저장 위치(로컬 파일 ↔ Netlify Blobs), `lib/auth.js` 관리자 인증·CSRF
- `views/` EJS, `public/css/style.css` 디자인 시스템, `public/js/main.js` 모션
- `netlify/functions/server.mjs` + `netlify.toml` — Netlify 배포

## 규칙
- 데이터 변경은 `await store.xxx()` 로만. 파일 직접 쓰기 금지 (Netlify 는 읽기 전용 파일시스템).
- 화장품 광고 규정 준수: 의약품 오인·미인증 기능성 표현 금지.
- 디자인 토큰/모션 원칙은 `docs/DESIGN.md`, 기획 원칙은 `docs/PLANNING.md`.
- 에이전트: `.claude/agents/` (planner, designer, developer, qa)
