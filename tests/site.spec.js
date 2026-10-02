// @ts-check
const { test, expect } = require('@playwright/test');

const PHONE = '010-4030-5956';

test.describe('공개 페이지', () => {
  test('메인: 핵심 정보와 구매 문의 동선', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page).toHaveTitle(/인테라/);
    await expect(page.locator('h1.hero__title')).toBeVisible();
    // 전화 링크가 대표번호로 연결
    await expect(page.locator(`a[href="tel:01040305956"]`).first()).toBeAttached();

    // 하단 사업자 정보(상호/대표자/상담시간)는 표시하지 않음
    await expect(page.locator('.site-footer')).not.toContainText('정정숙');
    await expect(page.locator('.site-footer')).not.toContainText('대표자');
    await expect(page.locator('.site-footer')).toContainText('24시간');
    await expect(page.locator('.logo__en')).toHaveText('INTERRA');
    await expect(page.locator('body')).not.toContainText('제이앤코슈');
    // 시그니처 상품 노출
    expect(await page.locator('.showcase .p-card').count()).toBeGreaterThanOrEqual(3);
    // 결제 기능이 없어야 함
    await expect(page.locator('text=장바구니')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('SEO: 메타태그, 구조화 데이터, sitemap, robots', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /인테라/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png/);
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld || '{}').telephone).toBe(PHONE);
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/products/');
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
  });

  test('제품 목록 → 상세: 가격과 전화 구매 버튼', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('.grid-products .p-card')).toHaveCount(32);
    await page.locator('.grid-products .p-card a').first().click();
    await expect(page.locator('.pdp__name')).toBeVisible();
    await expect(page.locator('.pdp__price')).toContainText('소비자가');
    await expect(page.locator('.pdp__buy a[href^="tel:"]')).toContainText('전화로 구매 문의');
    await expect(page.locator('.pdp__buy a[href^="sms:"]')).toBeAttached();
    await expect(page.locator('.pdp__notice')).toContainText('24시간');
    // 공식 상세 이미지 표시
    await expect(page.locator('.pdp-detail__body img')).toHaveCount(1);
    const detail = await page.locator('.pdp-detail__body img').getAttribute('src');
    expect((await page.request.get(detail || '')).status()).toBe(200);
  });

  test('카탈로그: 카테고리별 전 제품 + 소비자가 + 수상 표시', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.locator('.cat-cover__title')).toContainText('INTERRA');
    await expect(page.locator('.cat-item')).toHaveCount(32);
    await expect(page.locator('.cat-group')).toHaveCount(7);
    await expect(page.locator('.cat-item', { hasText: '볼륨 에센스 프리미엄' })).toContainText('150,000원');
    await expect(page.locator('.cat-item', { hasText: '이지튠 인써마샷' })).toContainText('660,000원');
    await expect(page.locator('.cat-item', { hasText: '어메니티 물티슈' })).toContainText('3,000원');
    // 가격표 전 제품 반영: '상담 시 안내' 표시 없음
    await expect(page.locator('.cat-item__price', { hasText: '상담 시 안내' })).toHaveCount(0);
    await expect(page.locator('.seal--lg')).toContainText('3년 연속 대상');
    await expect(page.locator('.cat-order__phone')).toHaveText(PHONE);
  });

  test('메인: 수상 섹션', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.awards .medal')).toHaveCount(3);
    await expect(page.locator('.awards')).toContainText('고객감동브랜드대상');
    await expect(page.locator('text=닥터펩티')).toHaveCount(0);
  });

  test('가로 스크롤이 생기지 않음', async ({ page }) => {
    for (const url of ['/', '/products', '/catalog', '/contact']) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, url).toBeLessThanOrEqual(1);
    }
  });

  test('상담 신청 접수', async ({ page }) => {
    await page.goto('/contact');
    const form = page.locator('form.inquiry__form');
    await form.locator('input[name="name"]').fill('테스트고객');
    await form.locator('input[name="phone"]').fill('010-9999-0000');
    await form.locator('textarea[name="message"]').fill('선물용 세트 문의');
    await form.locator('input[name="agree"]').check();
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('.notice--ok')).toBeVisible();
  });

  test('뒤로가기 · 로고 클릭 시 항상 맨 위에서 시작', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.mouse.wheel(0, 3000);
    await page.evaluate(() => window.scrollTo(0, 2500));
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    await page.goto('/products');
    await page.waitForLoadState('load');
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(500);
    // 뒤로가기 → 메인 맨 위
    await page.goBack();
    await page.waitForLoadState('load');
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
    // 다른 페이지에서 로고 클릭 → 메인 맨 위
    await page.goto('/catalog');
    await page.waitForLoadState('load');
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('.logo').click());
    await page.waitForURL('**/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
    // 메인에서 아래로 내린 뒤 로고 클릭 → 맨 위로 이동
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('.logo').click());
    await page.waitForTimeout(2000);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
  });

  test('없는 페이지는 404', async ({ page }) => {
    const res = await page.goto('/products/없는-상품');
    expect(res?.status()).toBe(404);
  });
});

test.describe('모바일 전용', () => {
  test.skip(({ isMobile }) => !isMobile, '모바일에서만');
  test('메뉴 열기와 하단 전화 바', async ({ page }) => {
    await page.goto('/products');
    await page.locator('[data-menu-toggle]').click();
    await expect(page.locator('.mobile-menu nav a').first()).toBeVisible();
    await page.locator('[data-menu-toggle]').click();
    await expect(page.locator('.callbar')).toHaveClass(/is-visible/);
    await expect(page.locator('.callbar a[href^="tel:"]')).toBeVisible();
  });
});

test.describe('관리자', () => {
  test.skip(({ isMobile }) => isMobile, 'PC 에서 1회만');
  test('로그인 → 상품 등록(사진 포함) → 홈페이지 반영 → 문의 확인', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('.a-alert--err')).toBeVisible();
    await page.fill('input[name="password"]', 'test-pass');
    await page.click('button[type="submit"]');
    await expect(page.locator('h1')).toHaveText('상품 관리');

    await page.click('text=+ 새 상품 등록');
    await page.waitForLoadState('load'); // 관리자 스크립트(사진 미리보기) 준비 대기
    await page.fill('input[name="name"]', 'QA 테스트 앰플');
    await page.fill('input[name="category"]', '앰플');
    await page.fill('input[name="price"]', '45000');
    await page.fill('textarea[name="summary"]', 'QA 요약 문구');
    await page.locator('[data-file-input]').nth(0).setInputFiles('public/img/apple-touch-icon.png');
    await page.locator('[data-file-input]').nth(1).setInputFiles('public/img/og-image.png');
    await expect(page.locator('[data-new-previews] img')).toHaveCount(2);
    await expect(page.locator('[data-submit]')).toHaveText('저장하기');
    await page.click('[data-submit]');
    await expect(page.locator('.a-alert--ok')).toBeVisible();
    await expect(page.locator('.a-item h2', { hasText: 'QA 테스트 앰플' })).toBeVisible();

    await page.goto('/products?category=' + encodeURIComponent('앰플'));
    const card = page.locator('.p-card', { hasText: 'QA 테스트 앰플' });
    await expect(card).toContainText('소비자가');
    await expect(card).toContainText('45,000원');
    const src = await card.locator('img').getAttribute('src');
    expect(src).toMatch(/^\/uploads\//);
    const img = await page.request.get(src || '');
    expect(img.status()).toBe(200);
    await card.locator('a').first().click();
    const detailSrc = await page.locator('.pdp-detail__body img').getAttribute('src');
    expect(detailSrc).toMatch(/^\/uploads\//);
    expect((await page.request.get(detailSrc || '')).status()).toBe(200);

    await page.goto('/admin/inquiries');
    await expect(page.locator('h1')).toHaveText('고객 문의');
  });
});
