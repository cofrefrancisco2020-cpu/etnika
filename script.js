/* ═══════════════════════════════════════════
   ETNIKA ECO & AVENTURA — script.js
   Scroll frames · Filtros · Reveal · Header
═══════════════════════════════════════════ */

(() => {
  'use strict';

  /* ─────────────────────────────────────────
     CONFIGURACIÓN FRAMES
  ───────────────────────────────────────── */
  const TOTAL_FRAMES = 119;
  const FRAMES_DIR   = 'frames/';
  const SCROLL_MULT  = 7;   // 700vh total (hero-frame-section height: 700vh)
  const MOBILE_FRAME_FOCUS_X = 0.63;

  const pad = n => String(n).padStart(4, '0');
  const frameSrc = i => `${FRAMES_DIR}frames_${pad(i + 1)}.png`;

  /* ─────────────────────────────────────────
     ELEMENTOS
  ───────────────────────────────────────── */
  const loader      = document.getElementById('loader');
  const loaderFill  = document.getElementById('loader-fill');
  const loaderPct   = document.getElementById('loader-pct');
  const loaderVideo = document.querySelector('.loader-logo-video video');
  const canvas      = document.getElementById('frame-canvas');
  const ctx         = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const heroSection = document.querySelector('.hero-frame-section');
  const scrollHint  = document.getElementById('scroll-hint');
  const header      = document.getElementById('header');
  const burger      = document.getElementById('burger');
  const mobileNav   = document.getElementById('mobile-nav');
  const captions    = document.querySelectorAll('.hcap');
  const loaderStart = performance.now();
  const MIN_LOADER_TIME = 2400;

  /* ─────────────────────────────────────────
     UTILIDAD: tamaño canvas con DPR
  ───────────────────────────────────────── */
  let dpr = 1, vpW = 0, vpH = 0;

  function sizeCanvas() {
    if (!canvas) return;
    dpr  = Math.min(window.devicePixelRatio || 1, 2);
    vpW  = window.innerWidth;
    vpH  = window.innerHeight;
    canvas.style.width  = vpW + 'px';
    canvas.style.height = vpH + 'px';
    canvas.width  = Math.round(vpW * dpr);
    canvas.height = Math.round(vpH * dpr);
    ctx.scale(dpr, dpr);
  }

  /* ─────────────────────────────────────────
     DIBUJAR FRAME — object-fit: cover
  ───────────────────────────────────────── */
  function drawCover(img) {
    if (!img || !img.naturalWidth || !ctx) return;
    const iW = img.naturalWidth,  iH = img.naturalHeight;
    const cA = vpW / vpH,         iA = iW / iH;
    const focusX = vpW <= 768 ? MOBILE_FRAME_FOCUS_X : 0.5;
    let sx, sy, sw, sh;
    if (cA > iA) {
      sw = iW;
      sh = iW / cA;
      sx = 0;
      sy = (iH - sh) / 2;
    } else {
      sh = iH;
      sw = iH * cA;
      sy = 0;
      sx = Math.max(0, Math.min(iW - sw, (iW - sw) * focusX));
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, vpW, vpH);
  }

  /* ─────────────────────────────────────────
     PRECARGA DE FRAMES
  ───────────────────────────────────────── */
  const frames = new Array(TOTAL_FRAMES).fill(null);
  let loadedCount = 0;
  let allLoaded   = false;

  function startLoaderVideo() {
    if (!loaderVideo) return;
    loaderVideo.muted = true;
    loaderVideo.loop = true;
    loaderVideo.playsInline = true;
    loaderVideo.currentTime = 0;
    const playAttempt = loaderVideo.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
  }

  function waitForMinimumLoaderTime() {
    const elapsed = performance.now() - loaderStart;
    const remaining = Math.max(0, MIN_LOADER_TIME - elapsed);
    return new Promise(resolve => setTimeout(resolve, remaining));
  }

  function hideLoader() {
    if (!loader) return;
    loader.style.opacity = '0';
    loader.style.visibility = 'hidden';
    setTimeout(() => { loader.style.display = 'none'; }, 650);
  }

  function preloadFrames() {
    return new Promise(resolve => {
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const img  = new Image();
        const idx  = i;
        img.onload = img.onerror = () => {
          loadedCount++;
          const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
          if (loaderFill) loaderFill.style.width = pct + '%';
          if (loaderPct)  loaderPct.textContent  = pct + '%';
          if (img.naturalWidth) frames[idx] = img;
          if (loadedCount === TOTAL_FRAMES) resolve();
        };
        img.src = frameSrc(i);
        frames[i] = img; // referencia inmediata para evitar GC
      }
    });
  }

  /* ─────────────────────────────────────────
     LÓGICA DE SCROLL → FRAME
  ───────────────────────────────────────── */
  let currentIdx  = -1;
  let rafPending  = false;
  let targetIdx   = 0;
  let sectionTop  = 0;
  let scrollRange = 0;

  function updateMetrics() {
    if (!heroSection) return;
    sectionTop  = heroSection.offsetTop;
    scrollRange = heroSection.offsetHeight - window.innerHeight;
  }

  function getProgress() {
    const scrolled = window.scrollY - sectionTop;
    return Math.max(0, Math.min(1, scrolled / scrollRange));
  }

  function drawFrame(idx) {
    if (idx === currentIdx) return;
    if (!frames[idx] || !frames[idx].naturalWidth) return;
    currentIdx = idx;
    drawCover(frames[idx]);
  }

  function onScroll() {
    const progress = getProgress();
    targetIdx = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * TOTAL_FRAMES));

    // Ocultar scroll hint una vez que el usuario hace scroll
    if (window.scrollY > 40 && scrollHint) {
      scrollHint.classList.add('gone');
    }

    // Actualizar captions según progreso
    captions.forEach(cap => {
      const from = parseFloat(cap.dataset.from);
      const to   = parseFloat(cap.dataset.to);
      const active = progress >= from && progress < to;
      cap.classList.toggle('active', active);
    });

    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        drawFrame(targetIdx);
        rafPending = false;
      });
    }
  }

  /* ─────────────────────────────────────────
     HEADER SCROLL EFFECT
  ───────────────────────────────────────── */
  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 60);
  }

  /* ─────────────────────────────────────────
     REVEAL ON SCROLL (IntersectionObserver)
  ───────────────────────────────────────── */
  function initReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(el => observer.observe(el));
  }

  /* ─────────────────────────────────────────
     FILTROS DE ACTIVIDADES
  ───────────────────────────────────────── */
  function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards      = document.querySelectorAll('.act-card');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const cat = btn.dataset.cat;
        cards.forEach(card => {
          if (cat === 'all' || card.dataset.cat === cat) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }

  /* ─────────────────────────────────────────
     BURGER / MOBILE NAV
  ───────────────────────────────────────── */
  function initBurger() {
    if (!burger || !mobileNav) return;

    burger.addEventListener('click', () => {
      const isOpen = burger.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      burger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Cerrar al hacer click en un link del menú móvil
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('open');
        mobileNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ─────────────────────────────────────────
     RESIZE
  ───────────────────────────────────────── */
  let resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeCanvas();
      updateMetrics();
      // Redibujar frame actual
      const saved = currentIdx >= 0 ? currentIdx : 0;
      currentIdx = -1;
      drawFrame(saved);
    }, 100);
  }

  /* ─────────────────────────────────────────
     SMOOTH SCROLL para anclas
  ───────────────────────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href').slice(1);
        const el = document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ─────────────────────────────────────────
     GALERÍA — lightbox simple al click
  ───────────────────────────────────────── */
  function initGallery() {
    const galImgs = document.querySelectorAll('.galeria-mosaic img');
    if (!galImgs.length) return;

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.id = 'gal-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.92);
      z-index:500;display:flex;align-items:center;
      justify-content:center;cursor:pointer;
      opacity:0;pointer-events:none;
      transition:opacity .3s ease;
    `;
    const bigImg = document.createElement('img');
    bigImg.style.cssText = `max-width:92vw;max-height:88vh;object-fit:contain;border-radius:2px;`;
    overlay.appendChild(bigImg);
    document.body.appendChild(overlay);

    galImgs.forEach(img => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => {
        bigImg.src = img.src;
        bigImg.alt = img.alt;
        overlay.style.opacity  = '1';
        overlay.style.pointerEvents = 'all';
        document.body.style.overflow = 'hidden';
      });
    });

    overlay.addEventListener('click', () => {
      overlay.style.opacity  = '0';
      overlay.style.pointerEvents = 'none';
      document.body.style.overflow = '';
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        overlay.style.opacity  = '0';
        overlay.style.pointerEvents = 'none';
        document.body.style.overflow = '';
      }
    });
  }

  /* ─────────────────────────────────────────
     CLIMA — Open-Meteo (sin API key)
     Coordenadas: Malalcahuello −38.42, −71.58
  ───────────────────────────────────────── */
  const WMO_CODES = {
    0:  ['☀️',  'Despejado'],
    1:  ['🌤️', 'Mayormente despejado'],
    2:  ['⛅',  'Parcialmente nublado'],
    3:  ['☁️',  'Nublado'],
    45: ['🌫️', 'Niebla'],
    48: ['🌫️', 'Niebla con escarcha'],
    51: ['🌦️', 'Llovizna ligera'],
    53: ['🌦️', 'Llovizna moderada'],
    55: ['🌧️', 'Llovizna intensa'],
    61: ['🌧️', 'Lluvia ligera'],
    63: ['🌧️', 'Lluvia moderada'],
    65: ['🌧️', 'Lluvia intensa'],
    71: ['🌨️', 'Nieve ligera'],
    73: ['🌨️', 'Nieve moderada'],
    75: ['❄️',  'Nieve intensa'],
    77: ['🌨️', 'Granizo de nieve'],
    80: ['🌦️', 'Chubascos ligeros'],
    81: ['🌧️', 'Chubascos moderados'],
    82: ['⛈️',  'Chubascos fuertes'],
    85: ['🌨️', 'Chubascos de nieve'],
    86: ['❄️',  'Chubascos de nieve fuertes'],
    95: ['⛈️',  'Tormenta eléctrica'],
    96: ['⛈️',  'Tormenta con granizo'],
    99: ['⛈️',  'Tormenta intensa con granizo'],
  };

  function wmoInfo(code) {
    // Buscar código exacto o fallback al más cercano
    return WMO_CODES[code] || WMO_CODES[Math.floor(code / 10) * 10] || ['🌡️', 'Variable'];
  }

  const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function safeNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function activityTip({ rain, gust, uv, snow }) {
    if (gust >= 55) return 'Viento fuerte: confirma la salida guiada.';
    if (snow > 0) return 'Posible nieve: revisa ruta y cadenas.';
    if (rain >= 70) return 'Alta probabilidad de lluvia: lleva impermeable.';
    if (uv >= 7) return 'UV alto: bloqueador, lentes y gorro.';
    return 'Condiciones útiles para planificar tu actividad.';
  }

  function renderWeather(data) {
    const c = data.current;
    const d = data.daily;
    const [icon, desc] = wmoInfo(c.weather_code);

    // Actual
    document.getElementById('wc-icon').textContent  = icon;
    document.getElementById('wc-temp').textContent  = Math.round(c.temperature_2m) + '°';
    document.getElementById('wc-desc').textContent  = desc;
    document.getElementById('wc-feel').textContent  = Math.round(c.apparent_temperature) + '°C';
    document.getElementById('wc-hum').textContent   = c.relative_humidity_2m + '%';
    document.getElementById('wc-wind').textContent  = Math.round(c.wind_speed_10m) + ' km/h';
    document.getElementById('wc-gust').textContent  = Math.round(safeNumber(c.wind_gusts_10m)) + ' km/h';
    document.getElementById('wc-precip').textContent = (c.precipitation ?? 0).toFixed(1) + ' mm';
    document.getElementById('wc-rain').textContent = Math.round(safeNumber(d.precipitation_probability_max?.[0])) + '%';
    document.getElementById('wc-uv').textContent = safeNumber(d.uv_index_max?.[0]).toFixed(1);

    // Pronóstico 5 días
    const forecastEl = document.getElementById('wc-forecast');
    if (!forecastEl) return;
    forecastEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const date  = new Date(d.time[i] + 'T12:00:00');
      const [fi, ] = wmoInfo(d.weather_code[i]);
      const div = document.createElement('div');
      div.className = 'wc-day';
      div.innerHTML = `
        <span class="wc-day-name">${DIAS_ES[date.getDay()]}</span>
        <span class="wc-day-icon">${fi}</span>
        <span class="wc-day-max">${Math.round(d.temperature_2m_max[i])}°</span>
        <span class="wc-day-min">${Math.round(d.temperature_2m_min[i])}°</span>
        <span class="wc-day-extra">${Math.round(safeNumber(d.precipitation_probability_max?.[i]))}% lluvia</span>
        <span class="wc-day-extra">${Math.round(safeNumber(d.wind_gusts_10m_max?.[i]))} km/h ráf.</span>
      `;
      div.title = activityTip({
        rain: safeNumber(d.precipitation_probability_max?.[i]),
        gust: safeNumber(d.wind_gusts_10m_max?.[i]),
        uv: safeNumber(d.uv_index_max?.[i]),
        snow: safeNumber(d.snowfall_sum?.[i])
      });
      forecastEl.appendChild(div);
    }
  }

  function initWeather() {
    const card = document.getElementById('weather-card');
    if (!card) return;

    const url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=-38.42&longitude=-71.58'
      + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,'
      + 'weather_code,wind_speed_10m,wind_gusts_10m,precipitation'
      + '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,'
      + 'precipitation_probability_max,wind_gusts_10m_max,uv_index_max,snowfall_sum'
      + '&timezone=America%2FSantiago&forecast_days=5';

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(data => renderWeather(data))
      .catch(() => {
        const icon = document.getElementById('wc-icon');
        const desc = document.getElementById('wc-desc');
        if (icon) icon.textContent = '🌡️';
        if (desc) desc.textContent = 'No se pudo cargar el clima. Intenta más tarde.';
      });
  }

  /* ─────────────────────────────────────────
     INICIALIZACIÓN
  ───────────────────────────────────────── */
  function init() {
    startLoaderVideo();
    sizeCanvas();
    initBurger();
    initFilters();
    initSmoothScroll();
    initReveal();
    initGallery();
    initWeather();

    // Mostrar primer caption inmediatamente
    if (captions.length) captions[0].classList.add('active');

    // Precargar frames y luego arrancar
    Promise.all([preloadFrames(), waitForMinimumLoaderTime()]).then(() => {
      allLoaded = true;
      updateMetrics();
      currentIdx = -1;
      drawFrame(0);

      // Ocultar loader con fade
      hideLoader();

      // Listeners de scroll y resize
      window.addEventListener('scroll', onScroll,     { passive: true });
      window.addEventListener('scroll', onScrollHeader, { passive: true });
      window.addEventListener('resize', onResize);

      // Procesar estado inicial (por si la página cargó en medio)
      onScroll();
      onScrollHeader();
    });
  }

  // Arrancar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
