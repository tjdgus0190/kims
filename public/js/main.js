/* INTERRA — 인터랙션 & 모션 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = root.classList.contains('reduced-motion');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  window.__motionReady = true;

  /* ---------- 페이지 진입 시 항상 맨 위에서 시작 (주소에 #앵커가 있을 때만 예외) ---------- */
  var lenis = null;
  function toTop() {
    if (location.hash.length > 1 && document.querySelector(location.hash)) return;
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  }
  var touched = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
    window.addEventListener(ev, function () { touched = true; }, { passive: true, once: true });
  });
  toTop();
  /* 이미지 로딩이 끝난 뒤에도 한 번 더 (단, 사용자가 이미 스크롤을 시작했다면 건드리지 않음) */
  window.addEventListener('load', function () { if (!touched) toTop(); });
  /* 뒤로가기로 캐시된 페이지가 다시 보일 때(bfcache)도 맨 위로 */
  window.addEventListener('pageshow', function (e) { if (e.persisted) toTop(); });

  /* 로고: 메인에서 누르면 부드럽게 맨 위로, 다른 페이지에서는 메인으로 이동 후 맨 위 */
  $$('.logo').forEach(function (logo) {
    logo.addEventListener('click', function (e) {
      if (location.pathname === '/' || /(^|\/)(main|index)\.html$/.test(location.pathname)) {
        e.preventDefault();
        if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        if (lenis) lenis.scrollTo(0, { duration: 1.2 });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  /* ---------- 공통 UI (모션 라이브러리 없이도 동작) ---------- */
  var header = $('[data-header]');
  var callbar = $('.callbar');
  var lastY = 0;
  function onScroll(y) {
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      header.classList.toggle('is-hidden', y > 400 && y > lastY && !root.classList.contains('menu-open'));
    }
    if (callbar) callbar.classList.toggle('is-visible', y > 280 || !document.body.classList.contains('is-home'));
    lastY = y;
  }
  window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
  onScroll(window.scrollY);

  var toggle = $('[data-menu-toggle]');
  var menu = $('[data-mobile-menu]');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) menu.hidden = false;
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* 상품 상세 이미지 갤러리 */
  var mainImg = $('[data-gallery-main]');
  $$('[data-gallery-thumb]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!mainImg) return;
      $$('[data-gallery-thumb]').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      mainImg.style.opacity = 0;
      setTimeout(function () { mainImg.src = btn.getAttribute('data-gallery-thumb'); mainImg.style.opacity = 1; }, 200);
    });
  });

  /* 카탈로그: 인쇄 / 링크 복사 */
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
  $$('[data-copy-link]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = location.href.split('#')[0];
      var done = function () { toast('카탈로그 링크를 복사했습니다. 카카오톡·문자에 붙여넣어 공유하세요.'); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { window.prompt('아래 주소를 복사하세요', url); });
      else window.prompt('아래 주소를 복사하세요', url);
    });
  });

  /* ---------- 시그니처 슬라이더: 마우스 드래그(관성) · 터치 스와이프 · 버튼 · 진행바 ---------- */
  var track = $('[data-showcase-track]');
  var bar = $('[data-showcase-bar]');
  if (track) dragSlider(track);

  function dragSlider(el) {
    var prev = $('[data-showcase-prev]');
    var next = $('[data-showcase-next]');
    var max = function () { return el.scrollWidth - el.clientWidth; };
    var step = function () {
      var c = el.firstElementChild;
      return c ? c.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).columnGap) || 24) : 320;
    };
    function update() {
      var m = max();
      if (bar) bar.style.transform = 'scaleX(' + (m > 0 ? el.scrollLeft / m : 0) + ')';
      if (prev) prev.disabled = el.scrollLeft <= 2;
      if (next) next.disabled = el.scrollLeft >= m - 2;
    }
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    if (prev) prev.addEventListener('click', function () { el.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { el.scrollBy({ left: step(), behavior: 'smooth' }); });

    /* 마우스 드래그 (터치는 브라우저 기본 스와이프 사용) */
    var down = false, moved = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, vel = 0, raf = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false;
      startX = lastX = e.clientX; startLeft = el.scrollLeft; lastT = performance.now(); vel = 0;
      cancelAnimationFrame(raf);
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) { moved = true; el.classList.add('is-dragging'); }
      if (!moved) return;
      el.scrollLeft = startLeft - dx;
      var now = performance.now();
      vel = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX; lastT = now;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (!moved) return;
      var v = -vel * 16; /* 손을 놓은 속도만큼 미끄러지듯 이어서 이동 */
      (function glide() {
        el.scrollLeft += v; v *= 0.92;
        if (Math.abs(v) > 0.6 && el.scrollLeft > 0 && el.scrollLeft < max()) raf = requestAnimationFrame(glide);
        else el.classList.remove('is-dragging'); /* 스냅 복원 → 가장 가까운 카드에 정렬 */
      })();
    });
    /* 드래그로 끝난 경우 카드 링크가 클릭되지 않도록 */
    el.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* ---------- 펩타이드 파티클 캔버스 (히어로) ---------- */
  var canvas = $('[data-peptide-canvas]');
  if (canvas && !reduce) peptideField(canvas);

  if (!hasGsap || reduce) {
    root.classList.remove('js', 'show-intro');
    $$('[data-count]').forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    return;
  }

  /* ---------- 이하 GSAP 모션 ---------- */
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  /* 부드러운 스크롤 */
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    toTop();
    lenis.on('scroll', function (e) { ScrollTrigger.update(); onScroll(e.scroll); });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"], a[href^="/#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var hash = a.getAttribute('href').replace(/^\//, '');
        if (a.getAttribute('href').charAt(0) === '/' && location.pathname !== '/') return;
        var target = hash.length > 1 && document.querySelector(hash);
        if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -60 }); }
      });
    });
  }

  /* 텍스트 단어 단위 분할 */
  $$('[data-split]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w) {
      return '<span class="split-line" aria-hidden="true" style="display:inline-block"><span>' + w.replace(/</g, '&lt;') + '</span></span>';
    }).join(' ');
    gsap.from($$('.split-line > span', el), {
      yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  /* 등장 애니메이션 */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: function (els) {
      gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, overwrite: true });
    },
  });
  $$('[data-reveal-img]').forEach(function (el) {
    var img = $('img', el);
    var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%' } });
    tl.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.out' });
    if (img) tl.from(img, { scale: 1.3, duration: 1.8, ease: 'expo.out' }, 0);
  });

  /* 패럴랙스 */
  $$('[data-parallax]').forEach(function (el) {
    gsap.to(el, {
      yPercent: parseFloat(el.getAttribute('data-parallax')) || -10, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* 숫자 카운터 */
  $$('[data-count]').forEach(function (el) {
    var obj = { v: 0 };
    gsap.to(obj, {
      v: Number(el.getAttribute('data-count')), duration: 2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: function () { el.textContent = Math.round(obj.v); },
    });
  });

  /* 마퀴: 스크롤 속도에 반응 */
  var marquee = $('[data-marquee]');
  if (marquee) {
    var loop = gsap.to(marquee, { xPercent: -50, ease: 'none', duration: 38, repeat: -1 });
    ScrollTrigger.create({
      onUpdate: function (self) {
        var v = Math.min(Math.abs(self.getVelocity()) / 400, 5);
        gsap.to(loop, { timeScale: (self.direction || 1) * (1 + v), duration: 0.3, overwrite: true });
        gsap.to(loop, { timeScale: self.direction || 1, duration: 1.2, delay: 0.3 });
      },
    });
  }

  /* 수상 메달: 월계수가 돌며 펼쳐지고 연도가 떠오름 */
  $$('[data-medal]').forEach(function (m, i) {
    var tl = gsap.timeline({ scrollTrigger: { trigger: m, start: 'top 85%' } });
    tl.from($('.medal__laurel', m), { rotate: -120, scale: 0.6, opacity: 0, duration: 1.6, ease: 'expo.out', delay: i * 0.15 })
      .from($$('.medal__body > *', m), { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, '-=1.1');
  });
  var seal = $('.hero__seal');
  if (seal) gsap.from(seal, { scale: 0, rotate: -90, duration: 1.4, ease: 'back.out(1.6)', delay: root.classList.contains('show-intro') ? 3.2 : 1 });

  /* 시그니처 카드: 섹션에 들어올 때 오른쪽에서 차례로 등장 */
  if (track) {
    gsap.from(track.children, {
      x: 80, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: track, start: 'top 85%' },
    });
  }

  /* 인트로 + 히어로 */
  var heroLines = $$('[data-hero-line]');
  var heroIn = $$('[data-hero-in]');
  var heroVisual = $('[data-hero-visual]');
  var intro = $('[data-intro]');
  var heroTl = gsap.timeline({ paused: true });
  if (heroLines.length) {
    heroTl
      .from(heroLines, { yPercent: 115, rotate: 2, duration: 1.4, ease: 'power4.out', stagger: 0.12 })
      .from(heroIn, { opacity: 0, y: 24, duration: 1, ease: 'power3.out', stagger: 0.1 }, 0.35);
    if (heroVisual) {
      heroTl
        .from($('.hero__product', heroVisual), { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.inOut' }, 0)
        .from($('.hero__product img', heroVisual), { scale: 1.5, duration: 2.2, ease: 'expo.out' }, 0.2)
        .from($('.hero__orbit', heroVisual), { opacity: 0, scale: 0.8, duration: 1.8, ease: 'power3.out' }, 0.5);
    }
  }

  if (intro && root.classList.contains('show-intro')) {
    try { sessionStorage.setItem('jc-intro', '1'); } catch (e) {}
    if (lenis) lenis.stop();
    gsap.timeline({
      onComplete: function () { root.classList.remove('show-intro'); if (lenis) lenis.start(); },
    })
      .fromTo($$('.intro__mark span', intro), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.05 })
      .to($('.intro__line', intro), { scaleX: 1, duration: 0.8, ease: 'power3.inOut' }, '-=0.4')
      .to($$('.intro__mark span', intro), { yPercent: -110, duration: 0.6, ease: 'power3.in', stagger: 0.03 }, '+=0.2')
      .to($('.intro__line', intro), { scaleX: 0, transformOrigin: 'right', duration: 0.5, ease: 'power3.in' }, '<')
      .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=0.2')
      .add(function () { heroTl.play(); }, '-=0.7');
  } else {
    heroTl.play();
  }

  /* 히어로 비주얼: 마우스 & 스크롤 패럴랙스 */
  if (heroVisual) {
    gsap.to(heroVisual, {
      yPercent: 18, ease: 'none',
      scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
    });
    if (finePointer) {
      var qx = gsap.quickTo(heroVisual, 'rotationY', { duration: 1, ease: 'power3' });
      var qy = gsap.quickTo(heroVisual, 'rotationX', { duration: 1, ease: 'power3' });
      gsap.set(heroVisual, { transformPerspective: 1200 });
      $('[data-hero]').addEventListener('mousemove', function (e) {
        qx((e.clientX / window.innerWidth - 0.5) * 10);
        qy((e.clientY / window.innerHeight - 0.5) * -8);
      });
    }
  }

  /* ---------- 데스크톱 전용: 커서, 마그네틱 버튼, 카드 틸트 ---------- */
  if (finePointer) {
    document.body.classList.add('has-cursor');
    var cursor = $('.cursor');
    var dot = $('.cursor__dot');
    var ring = $('.cursor__ring');
    var dx = gsap.quickTo(dot, 'x', { duration: 0.1 });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    window.addEventListener('mousemove', function (e) { cursor.classList.add('is-active'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener('mouseleave', function () { cursor.classList.remove('is-active'); });
    document.addEventListener('mouseover', function (e) {
      var onTrack = !!e.target.closest('[data-showcase-track]');
      cursor.classList.toggle('is-drag', onTrack);
      cursor.classList.toggle('is-hover', !onTrack && !!e.target.closest('a, button, summary, [data-tilt], input, select, textarea'));
    });

    $$('[data-magnetic]').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      var my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.25);
        my((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('mouseleave', function () { mx(0); my(0); });
    });

    $$('[data-tilt]').forEach(function (card) {
      var inner = card.querySelector('.p-card__link') || card;
      gsap.set(inner, { transformPerspective: 900 });
      var tx = gsap.quickTo(inner, 'rotationY', { duration: 0.6, ease: 'power3' });
      var ty = gsap.quickTo(inner, 'rotationX', { duration: 0.6, ease: 'power3' });
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        tx(((e.clientX - r.left) / r.width - 0.5) * 8);
        ty(((e.clientY - r.top) / r.height - 0.5) * -8);
      });
      card.addEventListener('mouseleave', function () { tx(0); ty(0); });
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* ---------- 펩타이드 체인 파티클 ---------- */
  function peptideField(cv) {
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h, chains = [], mouse = { x: -9999, y: -9999 }, running = true, raf;

    function makeChain() {
      var len = 4 + Math.floor(Math.random() * 6);
      var x = Math.random() * w, y = Math.random() * h;
      var ang = Math.random() * Math.PI * 2;
      var beads = [];
      for (var i = 0; i < len; i++) {
        ang += (Math.random() - 0.5) * 1.4;
        x += Math.cos(ang) * 22; y += Math.sin(ang) * 22;
        beads.push({ ox: x, oy: y, x: x, y: y, r: 2 + Math.random() * 3.5, p: Math.random() * Math.PI * 2 });
      }
      return { beads: beads, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, a: 0.25 + Math.random() * 0.45 };
    }

    function resize() {
      var rect = cv.getBoundingClientRect();
      w = rect.width; h = rect.height;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(26, Math.max(10, (w * h) / 52000)));
      chains = [];
      for (var i = 0; i < count; i++) chains.push(makeChain());
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (var c = 0; c < chains.length; c++) {
        var ch = chains[c];
        for (var i = 0; i < ch.beads.length; i++) {
          var b = ch.beads[i];
          b.ox += ch.vx; b.oy += ch.vy;
          var wob = Math.sin(t * 0.0008 + b.p + i * 0.6) * 4;
          var tx = b.ox + wob, ty = b.oy + Math.cos(t * 0.0007 + b.p) * 4;
          var ddx = tx - mouse.x, ddy = ty - mouse.y, d2 = ddx * ddx + ddy * ddy;
          if (d2 < 22000) { var f = (22000 - d2) / 22000 * 40; var d = Math.sqrt(d2) || 1; tx += ddx / d * f; ty += ddy / d * f; }
          b.x += (tx - b.x) * 0.08; b.y += (ty - b.y) * 0.08;
        }
        var first = ch.beads[0];
        if (first.ox < -200) shift(ch, w + 300, 0); else if (first.ox > w + 200) shift(ch, -w - 300, 0);
        if (first.oy < -200) shift(ch, 0, h + 300); else if (first.oy > h + 200) shift(ch, 0, -h - 300);

        ctx.strokeStyle = 'rgba(168,130,79,' + ch.a * 0.55 + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ch.beads.forEach(function (b, k) { k ? ctx.lineTo(b.x, b.y) : ctx.moveTo(b.x, b.y); });
        ctx.stroke();
        ch.beads.forEach(function (b) {
          var g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 0, b.x, b.y, b.r * 1.6);
          g.addColorStop(0, 'rgba(255,248,235,' + ch.a + ')');
          g.addColorStop(0.5, 'rgba(201,169,120,' + ch.a + ')');
          g.addColorStop(1, 'rgba(168,130,79,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.6, 0, Math.PI * 2); ctx.fill();
        });
      }
      if (running) raf = requestAnimationFrame(draw);
    }
    function shift(ch, x, y) { ch.beads.forEach(function (b) { b.ox += x; b.oy += y; b.x += x; b.y += y; }); }

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', function () { clearTimeout(cv._t); cv._t = setTimeout(resize, 200); });
    cv.parentElement.addEventListener('mousemove', function (e) {
      var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    cv.parentElement.addEventListener('mouseleave', function () { mouse.x = mouse.y = -9999; });
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; raf = requestAnimationFrame(draw); }
      if (!vis) { running = false; cancelAnimationFrame(raf); }
    }).observe(cv);
  }
})();
