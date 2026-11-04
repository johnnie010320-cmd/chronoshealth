// VITA Labs 회사 사이트 — 공용 스크립트.
// (1) 모바일 메뉴 (2) 관리자 배너 캐러셀(placement=vitalabs) (3) 편집 콘텐츠(site-content) 주입
// (4) 히어로 코드 카드 마커 애니메이션.
// 편집 콘텐츠는 HTML에 기본값이 있고, 관리자가 채운 값이 있으면 override 한다.

(function () {
  // ── 모바일 메뉴 ──
  var menuBtn = document.querySelector('.menu-btn');
  var mobileNav = document.querySelector('.mobile-nav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      mobileNav.classList.toggle('open');
    });
  }

  // ── 코드 카드 마커 애니메이션 ──
  requestAnimationFrame(function () {
    document.querySelectorAll('.marker[data-pos]').forEach(function (m) {
      m.style.left = m.getAttribute('data-pos') + '%';
    });
  });

  // ── 편집 콘텐츠 주입 + 배너 자동 넘김 간격(관리자 설정) ──
  // 배너 캐러셀은 site-content 로드 이후에 시작해, 관리자가 정한 간격을 반영한다.
  var bannerHost = document.getElementById('banner');
  var bannerIntervalMs = 6000; // 기본값 — 관리자 미설정 시

  fetch('/api/v1/site-content')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var content = (data && data.content) || {};
      document.querySelectorAll('[data-sc]').forEach(function (el) {
        var k = el.getAttribute('data-sc');
        var v = content[k];
        if (v && v.trim()) el.textContent = v;
      });
      // 관리자가 정한 배너 자동 넘김 간격(밀리초). 2~60초로 제한.
      var raw = parseInt(content['vitalabs_banner_interval_ms'], 10);
      if (!isNaN(raw)) bannerIntervalMs = Math.min(60000, Math.max(2000, raw));
    })
    .catch(function () {})
    .then(loadBanners);

  // 관리자가 배너를 올리기 전 기본으로 보여줄 소개 배너(정적 SVG).
  // 관리자가 이미지/동영상을 등록하면 API 배너가 이 기본 배너를 대체한다.
  var SEED_BANNERS = [
    { kind: 'image', url: '/assets/seed-banner-1.svg', name: '디지털 트윈 헬스케어' },
    { kind: 'image', url: '/assets/seed-banner-2.svg', name: 'AI 건강 예측 리포트' },
    { kind: 'image', url: '/assets/seed-banner-3.svg', name: 'CHRO · Health-to-Earn' }
  ];

  function loadBanners() {
    if (!bannerHost) return;
    fetch('/api/v1/banners?placement=vitalabs')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var list = (data && data.banners) || [];
        var items = list.length
          ? list.map(function (b) {
              return { kind: b.kind, url: '/api/v1/banners/' + b.id + '/file', name: b.name || '' };
            })
          : SEED_BANNERS;
        renderBanner(bannerHost, items, bannerIntervalMs);
      })
      .catch(function () {
        // API 실패 시에도 기본 소개 배너는 노출.
        renderBanner(bannerHost, SEED_BANNERS, bannerIntervalMs);
      });
  }

  function renderBanner(host, list, intervalMs) {
    var idx = 0;
    host.innerHTML = '';
    var slides = list.map(function (b, i) {
      var slide = document.createElement('div');
      slide.className = 'slide' + (i === 0 ? ' on' : '');
      if (b.kind === 'video') {
        var v = document.createElement('video');
        v.src = b.url; v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('playsinline', '');
        slide.appendChild(v);
      } else {
        var img = document.createElement('img');
        img.src = b.url; img.alt = b.name || '';
        slide.appendChild(img);
      }
      host.appendChild(slide);
      return slide;
    });

    if (list.length > 1) {
      var prev = mkArrow('prev', '‹');
      var next = mkArrow('next', '›');
      var dots = document.createElement('div');
      dots.className = 'dots';
      var dotEls = list.map(function (_, i) {
        var d = document.createElement('button');
        d.className = i === 0 ? 'on' : '';
        d.addEventListener('click', function () { go(i); });
        dots.appendChild(d);
        return d;
      });
      prev.addEventListener('click', function () { go(idx - 1); });
      next.addEventListener('click', function () { go(idx + 1); });
      host.appendChild(prev); host.appendChild(next); host.appendChild(dots);
      setInterval(function () { go(idx + 1); }, intervalMs || 6000);

      function go(n) {
        idx = ((n % list.length) + list.length) % list.length;
        slides.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
        dotEls.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
      }
    }
  }

  function mkArrow(cls, ch) {
    var b = document.createElement('button');
    b.className = 'arrow ' + cls;
    b.textContent = ch;
    b.setAttribute('aria-label', cls === 'prev' ? '이전 배너' : '다음 배너');
    return b;
  }
})();
