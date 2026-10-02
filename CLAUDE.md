# 제이앤코슈 홈페이지 — 작업 가이드

화장품 판매업 제이앤코슈(대표 정정숙, 대표번호 010-4030-5956)의 안내형 홈페이지. **결제 기능 없음, 구매는 전화 문의.**

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
