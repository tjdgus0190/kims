# INTERRA 인테라 · 제품 카탈로그 홈페이지

**인테라(INTERRA)** 전 제품을 카탈로그처럼 소개하고, **구매는 대표번호(010-4030-5956)로 24시간 문의**받는 홈페이지입니다.
온라인 결제 기능은 없으며, 관리자가 직접 상품 사진·설명·가격을 등록/수정할 수 있습니다.

| 항목 | 내용 |
| --- | --- |
| 상호 표기 | INTERRA / 인테라 (하단 사업자 정보 미표시) |
| 대표번호 | 010-4030-5956 (24시간 문의 가능) |
| 제품 | 32종 · 7개 라인 (에디션, 코어튠, 에버튠, 이지튠, 100K 살롱에디션, 어메니티, 엠지투에이) |
| 주요 기능 | 제품 카탈로그(소비자가 표시, 인쇄/PDF), 전화·문자 구매 문의, 상담 신청 폼, 관리자 상품 관리, 수상 이력, 검색 노출(SEO) |
| 지원 환경 | PC · 태블릿 · 모바일 (반응형) |
| 기술 | Node.js + Express + EJS(서버 렌더링), GSAP · Lenis(모션), Netlify Functions + Netlify Blobs |

---

## 1. 화면 구성

| 주소 | 내용 |
| --- | --- |
| `/` | 메인 — 인트로 모션, 파티클 히어로 + 수상 엠블럼, 브랜드 스토리, 수상(3년 연속 대상) 메달, 시그니처 제품(가로 스크롤), 라인업, 구매 방법, 상담 신청 |
| `/products` | 제품 목록 (카테고리 필터) |
| `/catalog` | **카탈로그** — 카테고리별 전 제품, 소비자가, 주요 포인트. `인쇄 · PDF 저장`, `링크 복사` 버튼 (카카오톡 공유용) |
| `/products/:slug` | 제품 상세 — 사진 갤러리, 가격, **전화로 구매 문의** / 문자 / 상담 신청 |
| `/contact` | 문의하기 — 전화, 문자, 상담 신청 폼 |
| `/admin` | 관리자 — 상품 관리, 고객 문의 확인, 사이트 정보·문구·SEO 수정 |
| `/sitemap.xml`, `/robots.txt` | 검색엔진용 (자동 생성) |

모바일에서는 화면 하단에 **전화 문의 · 문자 문의 · 상담 신청** 바가 항상 따라다닙니다.

---

## 2. Netlify 배포 (GitHub 연동)

이 저장소는 Netlify 에 바로 배포할 수 있도록 설정되어 있습니다.

### 배포 구조

```
public/                     → Netlify CDN 이 그대로 제공 (CSS, JS, 이미지, 모션 라이브러리)
netlify/functions/server.mjs → 그 외 모든 요청(페이지, 관리자, 문의 접수)을 처리하는 서버리스 함수
Netlify Blobs                → 상품·문의·사이트 설정 데이터와 관리자가 올린 사진을 영구 저장
```

> 서버리스 환경은 디스크에 파일을 저장할 수 없기 때문에, 데이터와 업로드 사진은 **Netlify Blobs** 에 저장됩니다.
> 별도 DB 가입이나 설정 없이 Netlify 사이트마다 자동으로 제공됩니다.

### 설정 파일

| 파일 | 역할 |
| --- | --- |
| `netlify.toml` | 빌드 명령(`npm run build`), 배포 폴더(`public`), 함수 폴더, 캐시 헤더, Node 22 |
| `netlify/functions/server.mjs` | Express 앱을 Netlify Function(v2)으로 실행. `path: "/*"`, `preferStatic: true` 로 정적 파일 우선 |
| `scripts/build.js` | GSAP·Lenis 를 `public/vendor/` 로 복사 |

### 처음 배포하기 (최초 1회)

1. <https://app.netlify.com> 에 GitHub 계정으로 로그인
2. **Add new project → Import an existing project → GitHub** 선택 후 `tjdgus0190/kims` 저장소 선택
3. 배포할 브랜치 선택 (예: `main`, 또는 지금 작업 브랜치 `claude/jeancosu-cosmetics-homepage-4i7zjp`)
   - Build command / Publish directory / Functions directory 는 `netlify.toml` 에서 자동으로 읽습니다. (비워두면 됩니다)
4. **Environment variables** 에 아래 값을 추가 (Site configuration → Environment variables 에서도 나중에 추가 가능)

   | 이름 | 값 | 필수 |
   | --- | --- | --- |
   | `ADMIN_PASSWORD` | 관리자 비밀번호 (추측하기 어려운 값) | ✅ |
   | `SESSION_SECRET` | 긴 무작위 문자열 (예: 비밀번호 생성기로 40자) | 권장 |
   | `SITE_URL` | 실제 도메인 (예: `https://jncosu.co.kr`). 연결 전이면 생략 | 도메인 연결 후 |
   | `INQUIRY_WEBHOOK_URL` | 새 문의 알림 받을 슬랙/디스코드 웹훅 주소 | 선택 |

5. **Deploy** 클릭 → 1~2분 후 `https://<사이트이름>.netlify.app` 주소로 접속 가능
6. 사이트 이름 변경: Site configuration → **Change site name** (예: `jncosu` → `https://jncosu.netlify.app`)

### Preview URL (미리보기 주소) 만들기

Netlify 는 GitHub 과 연결되면 아래 미리보기 주소를 자동으로 만들어 줍니다.

| 종류 | 언제 생성되나 | 주소 형식 |
| --- | --- | --- |
| **Deploy Preview** | GitHub 에 Pull Request 를 열면 자동 생성, PR 에 링크가 댓글로 달림 | `https://deploy-preview-<PR번호>--<사이트이름>.netlify.app` |
| **Branch deploy** | Site configuration → Build & deploy → Branches and deploy contexts 에서 브랜치 배포를 켜면, 해당 브랜치에 push 할 때마다 생성 | `https://<브랜치이름>--<사이트이름>.netlify.app` |
| **Production** | 운영 브랜치(main 등)에 push/merge 할 때 | `https://<사이트이름>.netlify.app` |

> ⚠️ Netlify Blobs 데이터는 사이트 단위로 공유됩니다. 미리보기에서 관리자로 상품을 수정하면 운영 사이트에도 반영되니,
> 미리보기에서는 화면 확인 위주로 사용하세요.

### Netlify CLI 로 직접 배포 (선택)

```bash
npm i -g netlify-cli
netlify login
netlify init            # 이 폴더를 Netlify 사이트와 연결
netlify deploy --build  # 미리보기(draft) 배포 → 고유 Preview URL 출력
netlify deploy --build --prod  # 운영 배포
```

### 도메인 연결 & 검색 등록

1. Netlify → Domain management → **Add a domain** 으로 구입한 도메인 연결 (HTTPS 자동)
2. 환경변수 `SITE_URL` 을 실제 도메인으로 설정 후 재배포
3. [네이버 서치어드바이저](https://searchadvisor.naver.com) 에 사이트 등록 → HTML 태그 방식의 `content` 값을 관리자 **사이트 정보 → 네이버 인증 코드** 에 입력 → 사이트맵 `https://도메인/sitemap.xml` 제출
4. [구글 서치콘솔](https://search.google.com/search-console) 도 같은 방법으로 등록
5. 네이버 스마트플레이스(지도) 등록 시 홈페이지 주소로 이 사이트를 입력하면 검색 노출에 도움이 됩니다.

---

## 3. 관리자 사용법

1. `https://도메인/admin` 접속 → `ADMIN_PASSWORD` 로 로그인
2. **상품 관리**
   - `+ 새 상품 등록`: 사진(여러 장), **상세 이미지**(쇼핑몰 상세페이지처럼 긴 이미지), 상품명, 카테고리, 용량, 소비자가, 주요 포인트, 설명, 사용법, 성분 입력
   - 사진은 업로드 전에 브라우저에서 자동으로 최적화(최대 1600px, WebP)됩니다. 첫 번째 사진이 대표 이미지입니다.
   - 판매가를 비워두면 **‘가격 문의’** 로 표시됩니다. 정가를 입력하면 할인율이 자동 표시됩니다.
   - ↑ ↓ 로 노출 순서 변경, ★ 로 메인 화면 ‘시그니처’ 지정, ‘숨기기’ 로 판매 중단 상품 비노출
3. **고객 문의**: 상담 신청 내역 확인, 전화번호 터치 시 바로 전화, 메모와 처리 완료 표시
4. **사이트 정보**: 대표번호, 상담시간, 사업자 정보, 메인 문구, 브랜드 스토리, 검색 노출 문구 수정

---

## 4. 로컬 개발

```bash
npm install
cp .env.example .env     # ADMIN_PASSWORD 등 수정
npm run dev              # http://localhost:3000 (파일 변경 시 자동 재시작)
npm test                 # QA 자동 테스트 (PC + 모바일, Playwright)
```

로컬에서는 데이터가 `data/db.json`, 업로드 사진이 `uploads/` 에 저장됩니다. (둘 다 git 에 올라가지 않음)
처음 실행 시 `data/seed.json` 의 초기 상품 6종이 자동으로 들어갑니다.

일반 서버(VPS 등)에 배포할 때는 `npm start` 로 실행하고, `DATA_DIR` / `UPLOAD_DIR` 을 영구 디스크 경로로 지정하세요.

---

## 5. 초기 데이터에 대한 안내 (꼭 확인해 주세요)

- 제품 32종은 전달받은 **인테라 공식 이미지(썸네일 + 상세페이지)** 를 분석(OCR)해 만들었습니다.
  - 제품명 · 용량 · 기능성 · 주요 특징 · 사용법은 상세 이미지의 제품정보 표와 본문을 바탕으로 정리했습니다.
  - 각 제품 상세 화면 하단에 공식 상세 이미지가 그대로 표시됩니다. (`public/products/*-detail.jpg`)
- **소비자가**는 상세 이미지에 없어, 공개 자료로 확인된 2종(보툴엑소 볼륨 에센스 프리미엄 150,000원, 물빛 커버 에센스 팩트 50,000원)만 입력했습니다. 나머지는 **‘상담 시 안내’** 로 표시되니 관리자에서 입력해 주세요.
- 수상 이력: 공개 자료로는 2025 대한민국 고객감동브랜드대상(뷰티브랜드·스킨케어프로그램 부문) **2년 연속** 수상까지 확인했습니다. 요청에 따라 ‘3년 연속 대상 (2024 · 2025 · 2026)’으로 표시했으니 실제 수상 내역을 **관리자 → 사이트 정보 → 수상 이력**에서 확인해 주세요.
- 엠지투에이(건강기능식품) 문구는 제품 표시사항의 기능성 문구 그대로 사용했습니다. 건강기능식품 광고는 사전 심의 대상이니 문구를 임의로 늘리지 마세요.
- 라인별 소개 문구는 **관리자 → 사이트 정보 → 제품 라인 소개** 에서 `카테고리명|영문명|소개` 형식으로 수정할 수 있습니다.
- `data/seed.json` 의 `seedVersion` 을 올리면 다음 접속 시 상품·사이트 문구가 초기 데이터로 **교체**됩니다(고객 문의는 유지). 관리자에서 수정한 내용도 덮어쓰니 주의하세요.

---

## 6. 폴더 구조

```
server.js                 Express 앱 (로컬: 직접 실행 / Netlify: 함수가 import)
netlify/functions/        Netlify 함수 진입점
netlify.toml              Netlify 배포 설정
lib/                      저장소(store/backend), 인증, 뷰 도우미
routes/                   공개 페이지, 관리자 라우트
views/                    EJS 템플릿 (partials/, admin/)
public/                   CSS, JS(모션), 이미지, products/ (공식 제품 사진·상세 이미지)
data/seed.json            초기 데이터 (상품 32종, 사이트 문구)
scripts/                  빌드
tests/                    Playwright QA 테스트
docs/                     기획서, 디자인 가이드
.claude/agents/           Claude Code 에이전트 (기획자/디자이너/개발자/QA)
```
