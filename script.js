/* ═══════════════════════════════════════════
   ETNIKA ECO & AVENTURA — script.js
   Hero automático · Filtros · Reveal · Header
═══════════════════════════════════════════ */

(() => {
  'use strict';

  /* ─────────────────────────────────────────
     CONFIGURACIÓN FRAMES
  ───────────────────────────────────────── */
  const TOTAL_FRAMES = 119;
  const FRAMES_DIR   = 'frames/';
  const MOBILE_FRAME_FOCUS_X = 0.63;
  // Duración de un ciclo completo del hero en ms (~12 segundos)
  const HERO_CYCLE_MS = 12000;

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

  function startLoaderVideo() {
    if (!loaderVideo) return Promise.resolve();

    let settled = false;
    let resolveReady = () => {};
    const markReady = () => {
      if (settled) return;
      settled = true;
      resolveReady();
    };

    const readyPromise = new Promise(resolve => {
      resolveReady = resolve;
      loaderVideo.addEventListener('playing', markReady, { once: true });
      loaderVideo.addEventListener('canplay', markReady, { once: true });
      loaderVideo.addEventListener('loadeddata', markReady, { once: true });
      setTimeout(markReady, 1800);
    });

    loaderVideo.muted = true;
    loaderVideo.loop = true;
    loaderVideo.playsInline = true;
    loaderVideo.preload = 'auto';
    loaderVideo.load();
    loaderVideo.currentTime = 0;
    const playAttempt = loaderVideo.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(markReady);
    }

    return readyPromise;
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

  function updateLoaderProgress() {
    const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
    if (loaderFill) loaderFill.style.width = pct + '%';
    if (loaderPct)  loaderPct.textContent  = pct + '%';
  }

  function loadFrame(idx, priority = 'auto') {
    return new Promise(resolve => {
      if (frames[idx] && frames[idx].naturalWidth) {
        resolve(frames[idx]);
        return;
      }

      const img = new Image();
      img.decoding = 'async';
      if ('fetchPriority' in img) img.fetchPriority = priority;
      img.onload = img.onerror = () => {
        loadedCount++;
        updateLoaderProgress();
        if (img.naturalWidth) frames[idx] = img;
        resolve(img.naturalWidth ? img : null);
      };
      img.src = frameSrc(idx);
      frames[idx] = img; // referencia inmediata para evitar GC
    });
  }

  function preloadFrames() {
    const requests = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      requests.push(loadFrame(i, i < 12 ? 'high' : 'auto'));
    }
    return Promise.all(requests);
  }

  /* ─────────────────────────────────────────
     ANIMACIÓN AUTOMÁTICA DEL HERO (loop fluido)
     - Ciclo de 12 segundos, loop infinito
     - Captions cambian automáticamente según progreso
  ───────────────────────────────────────── */
  let heroAnimRaf = null;
  let heroStartTs = null;
  let currentIdx  = -1;

  function updateCaptionsAuto(raw) {
    // raw = 0 a 1 (posición en el ciclo actual)
    captions.forEach(cap => {
      const from = parseFloat(cap.dataset.from);
      const to   = parseFloat(cap.dataset.to);
      cap.classList.toggle('active', raw >= from && raw < to);
    });
  }

  function heroTick(ts) {
    if (!heroStartTs) heroStartTs = ts;
    const elapsed = ts - heroStartTs;
    const raw     = (elapsed % HERO_CYCLE_MS) / HERO_CYCLE_MS; // 0 → 1, loop

    const idx = Math.min(TOTAL_FRAMES - 1, Math.floor(raw * TOTAL_FRAMES));

    if (idx !== currentIdx && frames[idx] && frames[idx].naturalWidth) {
      currentIdx = idx;
      drawCover(frames[idx]);
    }

    updateCaptionsAuto(raw);
    heroAnimRaf = requestAnimationFrame(heroTick);
  }

  function startHeroAnim() {
    if (heroAnimRaf) cancelAnimationFrame(heroAnimRaf);
    heroStartTs = null;
    heroAnimRaf = requestAnimationFrame(heroTick);
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
     - "all" → solo cards con data-featured="true", ordenadas por data-order
     - categoría específica → todas las cards de esa categoría
  ───────────────────────────────────────── */
  function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards      = document.querySelectorAll('.act-card');
    if (!filterBtns.length) return;

    function applyFilter(cat) {
      if (cat === 'all') {
        const grid = document.getElementById('act-grid');
        // Obtener solo las 7 cards destacadas y ordenarlas
        const featured = Array.from(cards).filter(c => c.dataset.featured === 'true');
        featured.sort((a, b) => parseInt(a.dataset.order) - parseInt(b.dataset.order));

        // Ocultar todas primero
        cards.forEach(card => card.classList.add('hidden'));
        // Mostrar y reordenar las destacadas en el DOM
        featured.forEach(card => {
          card.classList.remove('hidden');
          if (grid) grid.appendChild(card);
        });
      } else {
        cards.forEach(card => {
          if (card.dataset.cat === cat) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      }
    }

    // Estado inicial: mostrar solo las 7 destacadas
    applyFilter('all');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilter(btn.dataset.cat);
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
      // Redibujar frame actual al cambiar tamaño
      if (currentIdx >= 0 && frames[currentIdx] && frames[currentIdx].naturalWidth) {
        const saved = currentIdx;
        currentIdx = -1;
        drawCover(frames[saved]);
        currentIdx = saved;
      }
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

    // Helper
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // ── Widget principal (sección Clima) ──
    setEl('wc-icon',   icon);
    setEl('wc-temp',   Math.round(c.temperature_2m) + '°');
    setEl('wc-desc',   desc);
    setEl('wc-feel',   Math.round(c.apparent_temperature) + '°C');
    setEl('wc-hum',    c.relative_humidity_2m + '%');
    setEl('wc-wind',   Math.round(c.wind_speed_10m) + ' km/h');
    setEl('wc-gust',   Math.round(safeNumber(c.wind_gusts_10m)) + ' km/h');
    setEl('wc-precip', (c.precipitation ?? 0).toFixed(1) + ' mm');
    setEl('wc-rain',   Math.round(safeNumber(d.precipitation_probability_max?.[0])) + '%');
    setEl('wc-uv',     safeNumber(d.uv_index_max?.[0]).toFixed(1));

    // Pronóstico 5 días (widget principal)
    const forecastEl = document.getElementById('wc-forecast');
    if (forecastEl) {
      forecastEl.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const date = new Date(d.time[i] + 'T12:00:00');
        const [fi] = wmoInfo(d.weather_code[i]);
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
          uv:   safeNumber(d.uv_index_max?.[i]),
          snow: safeNumber(d.snowfall_sum?.[i])
        });
        forecastEl.appendChild(div);
      }
    }

    // ── Widget compacto (sección Nosotros) ──
    setEl('nos-wc-icon', icon);
    setEl('nos-wc-temp', Math.round(c.temperature_2m) + '°');
    setEl('nos-wc-desc', desc);
    setEl('nos-wc-feel', Math.round(c.apparent_temperature) + '°C');
    setEl('nos-wc-hum',  c.relative_humidity_2m + '%');
    setEl('nos-wc-wind', Math.round(c.wind_speed_10m) + ' km/h');
    setEl('nos-wc-rain', Math.round(safeNumber(d.precipitation_probability_max?.[0])) + '%');

    const nosForecast = document.getElementById('nos-wc-forecast');
    if (nosForecast) {
      nosForecast.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const date = new Date(d.time[i] + 'T12:00:00');
        const [fi] = wmoInfo(d.weather_code[i]);
        const div = document.createElement('div');
        div.className = 'nos-wc-day';
        div.innerHTML = `
          <span class="nos-wc-day-name">${DIAS_ES[date.getDay()]}</span>
          <span class="nos-wc-day-icon">${fi}</span>
          <span class="nos-wc-day-max">${Math.round(d.temperature_2m_max[i])}°</span>
          <span class="nos-wc-day-min">${Math.round(d.temperature_2m_min[i])}°</span>
        `;
        nosForecast.appendChild(div);
      }
    }
  }

  function initWeather() {
    // El widget del clima existe en ambas secciones; basta con uno de los IDs
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
        const nosDesc = document.getElementById('nos-wc-desc');
        const nosIcon = document.getElementById('nos-wc-icon');
        if (nosDesc) nosDesc.textContent = 'No disponible';
        if (nosIcon) nosIcon.textContent = '🌡️';
      });
  }

  /* ─────────────────────────────────────────
     INICIALIZACIÓN
  ───────────────────────────────────────── */
  function init() {
    const loaderVideoReady = startLoaderVideo();
    sizeCanvas();
    initBurger();
    initFilters();
    initSmoothScroll();
    initReveal();
    initGallery();
    initWeather();

    // Mostrar primer caption inmediatamente
    if (captions.length) captions[0].classList.add('active');

    // Precargar frames y arrancar animación automática
    Promise.all([
      loaderVideoReady.then(() => preloadFrames()),
      waitForMinimumLoaderTime()
    ]).then(() => {
      // Dibujar primer frame
      if (frames[0] && frames[0].naturalWidth) drawCover(frames[0]);

      // Ocultar loader con fade
      hideLoader();

      // Arrancar animación automática en loop
      startHeroAnim();

      // Listeners generales
      window.addEventListener('scroll', onScrollHeader, { passive: true });
      window.addEventListener('resize', onResize);

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
