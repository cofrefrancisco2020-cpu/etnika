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
  const HERO_TARGET_FPS = 30;
  const HERO_CYCLE_MS = Math.round((TOTAL_FRAMES / HERO_TARGET_FPS) * 1000);
  const CAPTION_CYCLE_MS = 16000;

  const pad = n => String(n).padStart(4, '0');
  const frameSrc = i => `${FRAMES_DIR}frames_${pad(i + 1)}.png`;

  /* ─────────────────────────────────────────
     ELEMENTOS
  ───────────────────────────────────────── */
  const loader      = document.getElementById('loader');
  const loaderFill  = document.getElementById('loader-fill');
  const loaderPct   = document.getElementById('loader-pct');
  const loaderVideo = document.querySelector('.loader-logo-video video');
  const heroVideo   = document.getElementById('hero-video');
  const canvas      = document.getElementById('frame-canvas');
  const ctx         = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const header      = document.getElementById('header');
  const burger      = document.getElementById('burger');
  const mobileNav   = document.getElementById('mobile-nav');
  const captions    = document.querySelectorAll('.hcap');
  const loaderStart = performance.now();
  const MIN_LOADER_TIME = 1200;

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

    loaderVideo.addEventListener('playing', () => {
      loaderVideo.closest('.loader-logo-video')?.classList.add('is-playing');
    });

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
    if (!loaderVideo.currentSrc && loaderVideo.readyState === 0) {
      loaderVideo.load();
    }
    if (loaderVideo.paused && loaderVideo.currentTime === 0) {
      loaderVideo.currentTime = 0;
    }
    const playAttempt = loaderVideo.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(markReady);
    }

    return readyPromise;
  }

  function startHeroVideo() {
    if (!heroVideo) return Promise.resolve();

    return new Promise(resolve => {
      let settled = false;
      const markReady = () => {
        if (settled) return;
        settled = true;
        const playAttempt = heroVideo.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
          playAttempt.catch(() => {});
        }
        resolve();
      };

      if (heroVideo.readyState >= 2) markReady();
      else {
        heroVideo.addEventListener('loadeddata', markReady, { once: true });
        heroVideo.addEventListener('canplay', markReady, { once: true });
        setTimeout(markReady, 2200);
        heroVideo.load();
      }
    });
  }

  function startVisualLoaderProgress() {
    let pct = 8;
    if (loaderFill) loaderFill.style.width = pct + '%';
    if (loaderPct) loaderPct.textContent = pct + '%';
    return setInterval(() => {
      pct = Math.min(92, pct + Math.max(1, Math.round((92 - pct) * 0.14)));
      if (loaderFill) loaderFill.style.width = pct + '%';
      if (loaderPct) loaderPct.textContent = pct + '%';
    }, 110);
  }

  function completeVisualLoaderProgress(timer) {
    clearInterval(timer);
    if (loaderFill) loaderFill.style.width = '100%';
    if (loaderPct) loaderPct.textContent = '100%';
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
     - Ciclo a ~30 fps, loop infinito
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
    const captionRaw = (elapsed % CAPTION_CYCLE_MS) / CAPTION_CYCLE_MS;
    updateCaptionsAuto(captionRaw);
    heroAnimRaf = setTimeout(() => heroTick(performance.now()), 100);
  }

  function startHeroAnim() {
    if (heroAnimRaf) clearTimeout(heroAnimRaf);
    heroStartTs = performance.now();
    heroTick(heroStartTs);
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
     CLASIFICACIÓN TURÍSTICA Y FILTROS
  ───────────────────────────────────────── */
  const ACTIVITY_CLASSIFICATION = {
    'Araucaria Milenaria + Laguna Pehuenco · Verano': { experiences: 'nature', seasons: 'summer autumn spring', duration: 'short half' },
    'Araucaria Milenaria + Laguna Pehuenco · Invierno': { experiences: 'nature snow', seasons: 'winter', duration: 'short half' },
    'Mirador Sierra del Colorado': { experiences: 'nature adventure', seasons: 'summer autumn spring', duration: 'short' },
    'Trekking Piedra Santa': { experiences: 'nature adventure', seasons: 'summer autumn spring', duration: 'half' },
    'Laguna Espejo + Glaciar Sierra Nevada': { experiences: 'nature adventure', seasons: 'summer spring', duration: 'full' },
    'Laguna Captrén — P.N. Conguillío · Verano': { experiences: 'nature', seasons: 'summer', duration: 'short half' },
    'Laguna Captrén — P.N. Conguillío · Invierno': { experiences: 'nature snow', seasons: 'winter', duration: 'short half' },
    'Cráter Navidad': { experiences: 'adventure snow', seasons: 'summer autumn winter spring', duration: 'short half' },
    'Ascenso Volcán': { experiences: 'adventure snow', seasons: 'summer winter spring', duration: 'full' },
    'Tour Parque Nacional Conguillío': { experiences: 'nature', seasons: 'summer autumn spring', duration: 'full' },
    'Cuesta de Las Raíces': { experiences: 'nature snow', seasons: 'summer autumn winter spring', duration: 'full' },
    'Saltos Andinos': { experiences: 'nature', seasons: 'summer autumn spring', duration: 'half' },
    'Tour Lonquimay Full Day': { experiences: 'nature', seasons: 'summer autumn winter spring', duration: 'full' },
    'Rafting Familiar': { experiences: 'adventure', seasons: 'summer spring', duration: 'short' },
    'Kayak Río Cautín': { experiences: 'adventure', seasons: 'summer spring', duration: 'short' },
    'Pesca Recreativa': { experiences: 'nature relax', seasons: 'summer autumn winter spring', duration: 'half' },
    'Ciclovía': { experiences: 'nature adventure', seasons: 'summer autumn spring', duration: 'half' },
    'Backcountry': { experiences: 'adventure snow', seasons: 'winter spring', duration: 'full' },
    'Inducción Ski': { experiences: 'snow', seasons: 'winter', duration: 'full' },
    'Hiking con Raquetas': { experiences: 'nature snow', seasons: 'winter', duration: 'half' },
    'Mirador Laguna Blanca': { experiences: 'nature', seasons: 'summer autumn spring', duration: 'half' },
    'Tour & Trekking Mirador de Volcanes': { experiences: 'nature adventure', seasons: 'summer autumn spring', duration: 'full' },
    'Tour 2 Días': { experiences: 'nature adventure', seasons: 'summer autumn spring', duration: 'multiday' },
    'Conguillío Camp 2 Días': { experiences: 'nature adventure', seasons: 'summer autumn spring', duration: 'multiday' },
    'Cabalgatas': { experiences: 'nature adventure', seasons: 'summer autumn spring', duration: 'half' },
    'Canopy': { experiences: 'adventure', seasons: 'summer autumn spring', duration: 'short' },
    'Termas': { experiences: 'relax', seasons: 'summer autumn winter spring', duration: 'half' },
    'Giras de Estudio': { experiences: 'nature relax', seasons: 'summer autumn winter spring', duration: 'full' },
    'Traslado Aeropuerto': { experiences: 'relax', seasons: 'summer autumn winter spring', duration: 'half' }
  };

  function findActivityConfig(title, source) {
    return Object.entries(source).find(([key]) => title.startsWith(key))?.[1] || null;
  }

  function deriveDifficulty(card) {
    const value = normalizeText(card.querySelector('.act-diff')?.textContent || '').toLowerCase();
    if (value.includes('alta')) return 'hard';
    if (value.includes('media')) return 'moderate';
    return 'easy';
  }

  function initActivityExperienceData() {
    document.querySelectorAll('.act-card').forEach(card => {
      const title = normalizeText(card.querySelector('h3')?.textContent || '');
      const config = findActivityConfig(title, ACTIVITY_CLASSIFICATION);
      const defaults = {
        trekking: 'nature', volcanes: 'adventure snow', tours: 'nature',
        rio: 'adventure', ciclo: 'nature adventure', invernal: 'snow',
        paquetes: 'nature adventure', otros: 'relax'
      };
      card.dataset.activityTitle = title;
      card.dataset.experiences = config?.experiences || defaults[card.dataset.cat] || 'nature';
      card.dataset.seasons = config?.seasons || 'summer autumn winter spring';
      card.dataset.duration = config?.duration || 'half';
      card.dataset.difficulty = deriveDifficulty(card);
    });
  }

  function updateFilterResultsLanguage() {
    const results = document.getElementById('filter-results');
    if (!results || !results.dataset.count) return;
    const count = Number(results.dataset.count);
    const lang = document.documentElement.lang;
    if (lang.startsWith('en')) results.textContent = `${count} ${count === 1 ? 'experience' : 'experiences'}`;
    else if (lang.startsWith('pt')) results.textContent = `${count} ${count === 1 ? 'experiência' : 'experiências'}`;
    else results.textContent = `${count} ${count === 1 ? 'experiencia' : 'experiencias'}`;
  }

  function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn[data-experience]');
    const cards = Array.from(document.querySelectorAll('.act-card'));
    const season = document.getElementById('filter-season');
    const difficulty = document.getElementById('filter-difficulty');
    const duration = document.getElementById('filter-duration');
    const clear = document.getElementById('clear-activity-filters');
    const results = document.getElementById('filter-results');
    if (!filterBtns.length || !cards.length) return;

    let activeExperience = 'featured';
    let externalCategory = null;

    function applyFilters() {
      let visible = 0;
      cards.forEach(card => {
        const experienceMatch = externalCategory
          ? card.dataset.cat === externalCategory
          : activeExperience === 'featured'
            ? card.dataset.featured === 'true'
            : card.dataset.experiences.split(' ').includes(activeExperience);
        const seasonMatch = season.value === 'all' || card.dataset.seasons.split(' ').includes(season.value);
        const difficultyMatch = difficulty.value === 'all' || card.dataset.difficulty === difficulty.value;
        const durationMatch = duration.value === 'all' || card.dataset.duration.split(' ').includes(duration.value);
        const show = experienceMatch && seasonMatch && difficultyMatch && durationMatch;
        card.classList.toggle('hidden', !show);
        if (show) visible++;
      });
      if (results) {
        results.dataset.count = String(visible);
        updateFilterResultsLanguage();
      }
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        activeExperience = btn.dataset.experience;
        externalCategory = null;
        filterBtns.forEach(item => {
          const active = item === btn;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', String(active));
        });
        applyFilters();
      });
    });

    [season, difficulty, duration].forEach(select => select.addEventListener('change', applyFilters));
    document.querySelectorAll('[data-nav-experience]').forEach(link => {
      link.addEventListener('click', () => {
        document.querySelector(`.filter-btn[data-experience="${link.dataset.navExperience}"]`)?.click();
      });
    });
    document.querySelectorAll('[data-nav-cat]').forEach(link => {
      link.addEventListener('click', () => {
        externalCategory = link.dataset.navCat;
        filterBtns.forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        season.value = difficulty.value = duration.value = 'all';
        applyFilters();
      });
    });
    clear?.addEventListener('click', () => {
      activeExperience = 'featured';
      externalCategory = null;
      season.value = difficulty.value = duration.value = 'all';
      filterBtns.forEach(btn => {
        const active = btn.dataset.experience === 'featured';
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', String(active));
      });
      applyFilters();
    });
    applyFilters();
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
  const DIAS_I18N = {
    es: DIAS_ES,
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  };

  function dayLabel(date, lang = getSelectedLanguage()) {
    return (DIAS_I18N[lang] || DIAS_ES)[date.getDay()];
  }

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
    const lang = getSelectedLanguage();
    const [icon, descEs] = wmoInfo(c.weather_code);
    const desc = translatePhrase(descEs, lang);

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
          <span class="wc-day-name">${dayLabel(date, lang)}</span>
          <span class="wc-day-icon">${fi}</span>
          <span class="wc-day-max">${Math.round(d.temperature_2m_max[i])}°</span>
          <span class="wc-day-min">${Math.round(d.temperature_2m_min[i])}°</span>
          <span class="wc-day-extra">${Math.round(safeNumber(d.precipitation_probability_max?.[i]))}% ${translatePhrase('lluvia', lang)}</span>
          <span class="wc-day-extra">${Math.round(safeNumber(d.wind_gusts_10m_max?.[i]))} km/h ${translatePhrase('ráf.', lang)}</span>
        `;
        div.title = translatePhrase(activityTip({
          rain: safeNumber(d.precipitation_probability_max?.[i]),
          gust: safeNumber(d.wind_gusts_10m_max?.[i]),
          uv:   safeNumber(d.uv_index_max?.[i]),
          snow: safeNumber(d.snowfall_sum?.[i])
        }), lang);
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
          <span class="nos-wc-day-name">${dayLabel(date, lang)}</span>
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
      .then(data => {
        renderWeather(data);
        resetI18nCache();
        applyLanguage(localStorage.getItem('etnika-lang') || 'es');
      })
      .catch(() => {
        const icon = document.getElementById('wc-icon');
        const desc = document.getElementById('wc-desc');
        if (icon) icon.textContent = '🌡️';
        if (desc) desc.textContent = 'No se pudo cargar el clima. Intenta más tarde.';
        const nosDesc = document.getElementById('nos-wc-desc');
        const nosIcon = document.getElementById('nos-wc-icon');
        if (nosDesc) nosDesc.textContent = 'No disponible';
        if (nosIcon) nosIcon.textContent = '🌡️';
        resetI18nCache();
        applyLanguage(localStorage.getItem('etnika-lang') || 'es');
      });
  }

  /* ─────────────────────────────────────────
     INICIALIZACIÓN
  ───────────────────────────────────────── */
  const TOUR_PRICES = {
    'Araucaria Milenaria + Laguna Pehuenco · Verano': [175000, 107000, 86000, 74000, 66000, 62000],
    'Araucaria Milenaria + Laguna Pehuenco · Invierno': [190000, 116000, 93000, 80000, 72000, 67000],
    'Mirador Sierra del Colorado': [200000, 126000, 103000, 90000, 82000, 77000],
    'Cráter Navidad': [250000, 150000, 115000, 99000, 89000, 82000],
    'Ascenso Volcán Lonquimay': [380000, 217000, 165000, 170000, 147000, 132000],
    'Ascenso Volcán Llaima': [595000, 324000, 233000, 245000, 205000, 179000],
    'Ascenso Volcán Tolhuaca': [552000, 302000, 219000, 213000, 182000, 160000],
    'Ascenso Volcán Sierra Nevada': [525000, 290000, 235000, 225000, 190000, 170000],
    'Laguna Captrén — P.N. Conguillío · Verano': [320000, 191000, 148000, 124000, 115000, 105000],
    'Laguna Captrén — P.N. Conguillío · Invierno': [335000, 200000, 155000, 130000, 120000, 110000],
    'Cuesta de Las Raíces': [290000, 171000, 155000, 130000, 120000, 110000],
    'Inducción Ski & Snowboard': [280000, 215000, 195000, 183000, 177000, 172000],
    'Backcountry — Randonnée & Splitboard': [340000, 209000, 168000, 175000, 156000, 145000],
    'Saltos Andinos': [160000, 90000, 67000, 56000, 48000, 45000]
  };

  const MOUNTAIN_ASCENT_INCLUDES = [
    'Transporte en van privada',
    'Guía de montaña certificado ANGM local',
    'Guía de montaña adicional para grupos de 4 a 6 personas',
    'Snack y brunch',
    'Equipo técnico: casco, arnés, piolet y crampones',
    'Seguro de actividad para pasajeros chilenos',
    'Fotografías de la experiencia',
    'Interpretación natural y cultural'
  ];

  const TOUR_DETAILS = {
    'Araucaria Milenaria + Laguna Pehuenco · Verano': {
      facts: [['Lugar', 'Reserva Nacional Malalcahuello-Nalcas'], ['Distancia', '1,5 km Araucaria · 1,1 km Laguna'], ['Duración', '2,5 horas promedio'], ['Dificultad', 'Baja']],
      inclusions: ['Transporte en van privada', 'Guía certificado local', 'Snack', 'Seguro de actividad para pasajeros chilenos', 'Fotografías', 'Interpretación natural y cultural']
    },
    'Araucaria Milenaria + Laguna Pehuenco · Invierno': {
      facts: [['Lugar', 'Reserva Nacional Malalcahuello-Nalcas'], ['Distancia', '1,5 km Araucaria · 1,1 km Laguna'], ['Duración', '2,5 horas promedio'], ['Dificultad', 'Baja']],
      inclusions: ['Transporte en van privada', 'Guía certificado local', 'Snack', 'Raquetas de nieve, bastones y polainas', 'Seguro de actividad para pasajeros chilenos', 'Fotografías', 'Interpretación natural y cultural']
    },
    'Mirador Sierra del Colorado': {
      facts: [['Lugar', 'Reserva Nacional Malalcahuello-Nalcas'], ['Distancia', '7 km aprox.'], ['Duración', '3 horas promedio'], ['Dificultad', 'Media · media/alta en invierno']],
      inclusions: ['Transporte en van privada', 'Guía certificado local', 'Snack', 'Raquetas de nieve, bastones y polainas', 'Seguro de actividad para pasajeros chilenos', 'Fotografías', 'Interpretación natural y cultural']
    },
    'Cráter Navidad': {
      facts: [['Lugar', 'Reserva Nacional Malalcahuello-Nalcas'], ['Dificultad', 'Media · media/alta en invierno']],
      modalities: [
        ['Verano', '3–4 km aprox. · 3–4 horas ida y vuelta'],
        ['Invierno', '6 km aprox. · 6 horas ida y vuelta']
      ],
      inclusions: ['Transporte en van privada', 'Guía certificado local', 'Snack', 'Raquetas de nieve, bastones, polainas y crampones', 'Seguro de actividad para pasajeros chilenos', 'Fotografías', 'Interpretación natural y cultural']
    },
    'Ascenso Volcán Lonquimay': { inclusions: MOUNTAIN_ASCENT_INCLUDES, note: 'Zapatos de montaña disponibles con costo adicional de $12.000.' },
    'Ascenso Volcán Llaima': { inclusions: MOUNTAIN_ASCENT_INCLUDES, note: 'Requiere vestimenta adecuada y experiencia previa en al menos dos volcanes. Zapatos de montaña: $12.000 adicionales.' },
    'Ascenso Volcán Tolhuaca': { inclusions: MOUNTAIN_ASCENT_INCLUDES, note: 'Requiere vestimenta adecuada y experiencia previa en al menos dos volcanes. Zapatos de montaña: $12.000 adicionales.' },
    'Ascenso Volcán Sierra Nevada': {
      inclusions: MOUNTAIN_ASCENT_INCLUDES,
      note: 'Requiere vestimenta adecuada y experiencia previa en al menos dos volcanes. Zapatos de montaña: $12.000 adicionales.',
      availability: 'Apertura de temporada desde el 15 de noviembre.', opening: [11, 15]
    },
    'Laguna Espejo + Glaciar Sierra Nevada': { availability: 'Apertura de temporada desde el 15 de noviembre.', opening: [11, 15] },
    'Laguna Captrén — P.N. Conguillío · Verano': {
      inclusions: ['Transporte en van', 'Guía certificado local', 'Snack', 'Entrada al Parque Nacional Conguillío', 'Seguro de actividad para pasajeros chilenos', 'Fotografías', 'Interpretación natural y cultural']
    },
    'Laguna Captrén — P.N. Conguillío · Invierno': {
      inclusions: ['Transporte en van', 'Guía certificado local', 'Snack', 'Entrada al Parque Nacional Conguillío', 'Raquetas de nieve, polainas y bastones de trekking', 'Seguro de actividad para pasajeros chilenos', 'Fotografías', 'Interpretación natural y cultural']
    },
    'Tour Parque Nacional Conguillío': { availability: 'Disponible desde noviembre, sujeto a la apertura de accesos por nieve.', opening: [11, 1] },
    'Cuesta de Las Raíces': {
      inclusions: ['Transporte en van', 'Guía certificado local', 'Snack', 'Entrada a Patachoique', 'Raquetas de nieve, polainas y bastones de trekking', 'Seguro de actividad para pasajeros chilenos', 'Fotografías', 'Interpretación natural y cultural'],
      note: 'Se recomienda llevar efectivo para artesanía y comida tradicional pehuenche en el sector Arenales.'
    },
    'Inducción Ski & Snowboard': {
      facts: [['Lugar', 'Centro de Ski Corralco'], ['Clases', '2 horas · 12:00 a 14:00']],
      inclusions: ['Transporte en van', 'Guía local certificado', 'Ticket y clase', 'Equipo de ski: botas, skis, bastones y casco', 'Snack', 'Seguro de actividad', 'Fotografías']
    },
    'Backcountry — Randonnée & Splitboard': {
      facts: [['Sectores', 'Cerro La Plancha · Cuesta de Las Raíces · Mirador Cráter Navidad']],
      inclusions: ['Transporte en van', 'Guía local certificado', 'Guía adicional para grupos de 4 a 6 personas', 'Equipo de randonnée', 'Snack y brunch', 'Seguro de actividad', 'Fotografías', 'Interpretación natural y cultural']
    },
    'Saltos Andinos': {
      inclusions: ['Transporte', 'Guía local de excursiones', 'Snack', 'Entrada a Salto del Indio', 'Seguro de actividad', 'Fotografías', 'Interpretación natural y cultural']
    }
  };

  function cleanIncludeLabel(value) {
    return normalizeText(value).replace(/^[^A-Za-zÀ-ÿ0-9]+/, '');
  }

  function initActivityIncludes() {
    document.querySelectorAll('.act-card').forEach(card => {
      const oldIncludes = card.querySelector('.act-includes');
      if (!oldIncludes) return;
      const title = card.dataset.activityTitle || normalizeText(card.querySelector('h3')?.textContent || '');
      const config = findActivityConfig(title, TOUR_DETAILS) || {};
      const originalItems = Array.from(oldIncludes.querySelectorAll('span'))
        .map(item => cleanIncludeLabel(item.textContent))
        .filter(Boolean);
      const inclusions = config.inclusions || originalItems;
      const details = document.createElement('details');
      details.className = 'activity-includes';
      details.innerHTML = `
        <summary>
          <span>Qué incluye</span>
          <small><span>${inclusions.length}</span> <span>${inclusions.length === 1 ? 'servicio' : 'servicios'}</span></small>
          <span class="includes-chevron" aria-hidden="true">+</span>
        </summary>
        <div class="includes-content">
          ${config.facts ? `<dl class="activity-facts">${config.facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>` : ''}
          ${config.modalities ? `<div class="season-modalities">${config.modalities.map(([season, value]) => `<div><strong>${season}</strong><span>${value}</span></div>`).join('')}</div>` : ''}
          <strong class="includes-label">Servicios incluidos</strong>
          <ul>${inclusions.map(item => `<li>${item}</li>`).join('')}</ul>
          ${config.note ? `<p class="activity-detail-note">${config.note}</p>` : ''}
        </div>
      `;
      oldIncludes.replaceWith(details);

      if (config.availability) {
        const notice = document.createElement('p');
        notice.className = 'activity-availability';
        notice.textContent = config.availability;
        details.before(notice);
      }
    });
    resetI18nCache();
  }

  function formatClp(value) {
    return '$' + new Intl.NumberFormat('es-CL').format(value);
  }

  function initActivityCarousels() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('[data-carousel]').forEach(carousel => {
      const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
      const previous = carousel.querySelector('.carousel-prev');
      const next = carousel.querySelector('.carousel-next');
      const counter = carousel.querySelector('.carousel-counter');
      if (slides.length < 2 || !previous || !next) return;

      let current = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
      let timer = null;

      const show = target => {
        current = (target + slides.length) % slides.length;
        slides.forEach((slide, index) => {
          const active = index === current;
          slide.classList.toggle('is-active', active);
          slide.setAttribute('aria-hidden', String(!active));
        });
        if (counter) counter.textContent = `${current + 1} / ${slides.length}`;
      };

      const stop = () => {
        window.clearInterval(timer);
        timer = null;
      };

      const start = () => {
        if (reduceMotion || timer) return;
        timer = window.setInterval(() => show(current + 1), 2200);
      };

      previous.addEventListener('click', event => {
        event.stopPropagation();
        stop();
        show(current - 1);
      });
      next.addEventListener('click', event => {
        event.stopPropagation();
        stop();
        show(current + 1);
      });
      carousel.addEventListener('mouseenter', start);
      carousel.addEventListener('mouseleave', stop);
      carousel.addEventListener('focusin', start);
      carousel.addEventListener('focusout', event => {
        if (!carousel.contains(event.relatedTarget)) stop();
      });

      show(current);
    });
  }

  function initTourPricing() {
    document.querySelectorAll('.act-card').forEach(card => {
      const heading = card.querySelector('h3');
      if (!heading) return;
      const cardTitle = normalizeText(heading.textContent);
      const match = Object.entries(TOUR_PRICES).find(([title]) => cardTitle.startsWith(title));
      if (!match) return;

      const [, prices] = match;
      const priceEl = card.querySelector('.act-price');
      const button = card.querySelector('.act-btn');
      if (!priceEl || !button) return;

      const soloPrice = prices[0];
      const minimum = Math.min(...prices);
      const bestIndex = prices.indexOf(minimum);
      const maximumSaving = Math.max(0, Math.round((1 - minimum / soloPrice) * 100));
      priceEl.innerHTML = `
        <span class="act-price-offer">
          <span>Desde</span>
          <strong>${formatClp(minimum)}</strong>
          <span>por persona</span>
          <span class="group-saving-badge"><span>Ahorra hasta</span> ${maximumSaving}%</span>
        </span>
      `;

      const pricing = document.createElement('section');
      pricing.className = 'tour-prices';
      pricing.setAttribute('aria-label', 'Precios por cantidad de personas');
      pricing.innerHTML = `
        <div class="price-heading">
          <strong>Elige tu grupo</strong>
          <small>Ahorro comparado con la tarifa individual</small>
        </div>
        <div class="tour-price-grid">
          ${prices.map((price, index) => {
            const savingAmount = Math.max(0, soloPrice - price);
            const savingPercent = Math.max(0, Math.round((1 - price / soloPrice) * 100));
            const isBest = index === bestIndex;
            return `
              <button type="button" class="tour-price-row${isBest ? ' is-best' : ''}" data-booking-people="${index + 1}" data-booking-price="${price}" aria-label="Seleccionar ${index + 1} ${index === 0 ? 'persona' : 'personas'} por ${formatClp(price)} por persona">
                <span class="price-group"><b>${index + 1}</b> <span>${index === 0 ? 'persona' : 'personas'}</span></span>
                <span class="price-value">
                  <strong>${formatClp(price)}</strong>
                  <small>por persona</small>
                  ${index === 0
                    ? '<span class="price-saving">Tarifa individual</span>'
                    : `<span class="price-saving"><b>-${savingPercent}%</b> · <span>Ahorras</span> ${formatClp(savingAmount)}${isBest ? ' <span class="best-price-label">Mejor precio</span>' : ''}</span>`}
                  <span class="price-select">Elegir fecha</span>
                </span>
              </button>
            `;
          }).join('')}
        </div>
      `;
      card.querySelector('.act-body').insertBefore(pricing, button);
    });
    resetI18nCache();
  }

  /* ─────────────────────────────────────────
     RESERVA: PERSONAS + FECHA + WHATSAPP
  ───────────────────────────────────────── */
  const bookingContext = { card: null, title: '', prices: null };

  function toLocalISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getBookingMinimumDate(config) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!config?.opening) return today;
    const opening = new Date(today.getFullYear(), config.opening[0] - 1, config.opening[1]);
    return today < opening ? opening : today;
  }

  function updateBookingPrice() {
    const people = Number(document.getElementById('booking-people')?.value || 1);
    const priceBox = document.getElementById('booking-price');
    if (!priceBox) return;
    const price = bookingContext.prices?.[people - 1];
    priceBox.hidden = !price;
    priceBox.innerHTML = price
      ? `<span>Tarifa publicada</span><strong>${formatClp(price)} <small>por persona</small></strong>`
      : '';
  }

  function openBookingModal(card, selectedPeople = 2) {
    const modal = document.getElementById('booking-modal');
    const titleEl = document.getElementById('booking-activity');
    const peopleEl = document.getElementById('booking-people');
    const dateEl = document.getElementById('booking-date');
    const availabilityEl = document.getElementById('booking-availability');
    if (!modal || !titleEl || !peopleEl || !dateEl || !availabilityEl) return;

    const title = card.dataset.activityTitle || normalizeText(card.querySelector('h3')?.textContent || 'Experiencia ETNIKA');
    const priceMatch = Object.entries(TOUR_PRICES).find(([key]) => title.startsWith(key));
    const config = findActivityConfig(title, TOUR_DETAILS);
    const minimumDate = getBookingMinimumDate(config);
    bookingContext.card = card;
    bookingContext.title = title;
    bookingContext.prices = priceMatch?.[1] || null;

    titleEl.textContent = title;
    peopleEl.value = String(Math.max(1, Math.min(6, selectedPeople)));
    dateEl.min = toLocalISO(minimumDate);
    dateEl.value = '';
    availabilityEl.hidden = !config?.availability;
    availabilityEl.textContent = config?.availability || '';
    updateBookingPrice();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('booking-open');
    setTimeout(() => dateEl.focus(), 80);
  }

  function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('booking-open');
  }

  function bookingMessage(title, dateText, people, price, lang) {
    if (lang === 'en') {
      return `Hello ETNIKA! I am interested in ${title} for ${dateText}. We are ${people} people${price ? ` and saw the published rate of ${formatClp(price)} per person` : ''}. Is there availability?`;
    }
    if (lang === 'pt') {
      return `Olá ETNIKA! Tenho interesse em ${title} para ${dateText}. Somos ${people} pessoas${price ? ` e vimos a tarifa publicada de ${formatClp(price)} por pessoa` : ''}. Há disponibilidade?`;
    }
    return `Hola ETNIKA! Estoy interesado/a en ${title} para el ${dateText}. Somos ${people} personas${price ? ` y vimos la tarifa publicada de ${formatClp(price)} por persona` : ''}. ¿Tienen disponibilidad?`;
  }

  function initBookingFlow() {
    const modal = document.getElementById('booking-modal');
    const form = document.getElementById('booking-form');
    const peopleEl = document.getElementById('booking-people');
    if (!modal || !form || !peopleEl) return;

    document.addEventListener('click', event => {
      const close = event.target.closest('[data-booking-close]');
      if (close) {
        closeBookingModal();
        return;
      }

      const priceChoice = event.target.closest('.tour-price-row[data-booking-people]');
      if (priceChoice) {
        const card = priceChoice.closest('.act-card');
        if (card) openBookingModal(card, Number(priceChoice.dataset.bookingPeople));
        return;
      }

      const reserve = event.target.closest('.act-card .act-btn');
      if (reserve) {
        event.preventDefault();
        openBookingModal(reserve.closest('.act-card'), 2);
      }
    });

    peopleEl.addEventListener('change', updateBookingPrice);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.classList.contains('open')) closeBookingModal();
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const dateValue = document.getElementById('booking-date').value;
      const people = Number(peopleEl.value);
      const lang = document.documentElement.lang.startsWith('pt') ? 'pt' : document.documentElement.lang.startsWith('en') ? 'en' : 'es';
      const locale = lang === 'pt' ? 'pt-BR' : lang === 'en' ? 'en-GB' : 'es-CL';
      const dateText = new Date(`${dateValue}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
      const price = bookingContext.prices?.[people - 1] || null;
      const message = bookingMessage(bookingContext.title, dateText, people, price, lang);
      window.open(`https://wa.me/56996278258?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
      closeBookingModal();
    });
  }

  function initDifficultyLabels() {
    document.querySelectorAll('.act-diff').forEach(badge => {
      const level = normalizeText(badge.textContent);
      badge.innerHTML = `<small>Dificultad</small><strong>${level}</strong>`;
      badge.setAttribute('aria-label', `Dificultad: ${level}`);
    });
    resetI18nCache();
  }

  function initMediaPerformance() {
    document.querySelectorAll('img').forEach(img => {
      img.decoding = 'async';
      if (img.loading === 'lazy' && 'fetchPriority' in img) img.fetchPriority = 'low';
    });

    document.addEventListener('visibilitychange', () => {
      if (!heroVideo) return;
      if (document.hidden) heroVideo.pause();
      else {
        const playAttempt = heroVideo.play();
        if (playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(() => {});
      }
    });
  }

  const I18N = {
    en: {
      'Cargando ETNIKA': 'Loading ETNIKA',
      'Nosotros': 'About us',
      'Actividades': 'Activities',
      'Alojamiento': 'Lodging',
      'Clima': 'Weather',
      'Reservar': 'Book now',
      'Contacto': 'Contact',
      'Donde la': 'Where',
      'aventura': 'adventure',
      'comienza.': 'begins.',
      'Desde 2016': 'Since 2016',
      'Volcanes,': 'Volcanoes,',
      'ríos': 'rivers',
      'y bosques.': 'and forests.',
      'Guías Certificados': 'Certified guides',
      'Cada ruta,': 'Every route,',
      'una historia': 'a story',
      'que contar.': 'to tell.',
      'Tu aventura': 'Your adventure',
      'te espera.': 'is waiting.',
      'Ver experiencias': 'See experiences',
      'Sobre nosotros': 'About us',
      'Agencia 100%': '100%',
      'local': 'local',
      'de montaña.': 'mountain agency.',
      'Desde el año 2016 entregamos experiencias en la Araucanía Andina. Somos del pueblo de Malalcahuello, ubicado a 120 km de Temuco hacia la cordillera, rodeados de volcanes, ríos, bosques y las 4 estaciones claramente definidas.': 'Since 2016 we have created experiences in the Andean Araucanía. We are from Malalcahuello, 120 km from Temuco toward the mountains, surrounded by volcanoes, rivers, forests, and four clearly defined seasons.',
      'Profesionales del turismo, dispuestos a que tus días en la Araucanía sean mágicos.': 'Tourism professionals ready to make your days in Araucanía feel magical.',
      'Cargando clima…': 'Loading weather...',
      'Cargando…': 'Loading...',
      'Sensación': 'Feels like',
      'Humedad': 'Humidity',
      'Viento': 'Wind',
      'Lluvia hoy': 'Rain today',
      'Ráfagas': 'Gusts',
      'Prob. lluvia': 'Rain chance',
      'UV máx.': 'Max UV',
      'Ver detalle completo ↓': 'See full details ↓',
      'Experiencias': 'Experiences',
      'Elige tu': 'Choose your',
      'Filtra por categoría y encuentra la experiencia perfecta para ti.': 'Filter by category and find the perfect experience for you.',
      'Todas': 'All',
      '🌋 Volcanes': '🌋 Volcanoes',
      '🛶 Río': '🛶 River',
      '🚴 Cicloturismo': '🚴 Cycling',
      '⛷️ Invernal': '⛷️ Winter',
      '📦 Paquetes': '📦 Packages',
      '✨ Otros': '✨ Others',
      'Montañismo': 'Mountaineering',
      'Río': 'River',
      'Cicloturismo': 'Cycling',
      'Invernal': 'Winter',
      'Paquete': 'Package',
      'Cabalgata': 'Horseback riding',
      'Termas': 'Hot springs',
      'Giras': 'Group trips',
      'Traslado': 'Transfer',
      'Baja': 'Easy',
      'Media': 'Medium',
      'Alta': 'Hard',
      'Media/Alta': 'Medium/Hard',
      'Baja/Media': 'Easy/Medium',
      'Media/Baja': 'Medium/Easy',
      'Familiar': 'Family friendly',
      'Transporte': 'Transport',
      'Guía certif.': 'Certified guide',
      'Guía': 'Guide',
      'Guías certif.': 'Certified guides',
      'Snack': 'Snack',
      'Fotos': 'Photos',
      'Entrada': 'Entry ticket',
      'Entradas': 'Entry tickets',
      'Alimentación': 'Meals',
      'Equipo': 'Gear',
      'Equipo téc.': 'Technical gear',
      'Equipo técnico': 'Technical gear',
      'Equipo completo': 'Full gear',
      'Set campamento': 'Camp setup',
      'Bici + casco': 'Bike + helmet',
      'Vehículo ejecutivo': 'Private vehicle',
      'Bus privado': 'Private bus',
      'Staff Etnika': 'Etnika staff',
      'Ticket ski': 'Ski ticket',
      'Equipo ski/snow': 'Ski/snow gear',
      'Entrada termas': 'Hot springs entry',
      'Seguros': 'Insurance',
      'Desde': 'From',
      'Dificultad': 'Difficulty',
      'Precios por cantidad de personas': 'Prices by group size',
      'Ver precios': 'View prices',
      'Ocultar': 'Hide',
      'Arma tu grupo y ahorra': 'Build your group and save',
      'Elige tu grupo': 'Choose your group',
      'Más personas, menor valor por persona': 'More people, lower price per person',
      'Ahorra hasta': 'Save up to',
      'Hasta': 'Up to',
      'menos por persona': 'less per person',
      'Ahorro comparado con la tarifa individual': 'Savings compared with the individual rate',
      'por persona': 'per person',
      'Tarifa individual': 'Individual rate',
      'Ahorras': 'You save',
      'Mejor precio': 'Best price',
      'persona': 'person',
      'personas': 'people',
      'Consultar': 'Ask us',
      'Bosques milenarios hasta una laguna de origen volcánico, con vistas al Volcán Lonquimay.': 'Ancient forests leading to a volcanic-origin lagoon, with views of Volcán Lonquimay.',
      'El protagonista de Malalcahuello. Una de las mejores rutas para introducirse al mundo de los volcanes.': 'The landmark of Malalcahuello. One of the best routes to enter the world of volcanoes.',
      'Lagunas, Volcán Llaima, Salto Truful-Truful y trekking a elección dentro del Parque.': 'Lagoons, Volcán Llaima, Salto Truful-Truful, and your choice of trekking route inside the park.',
      'Sensación del verano. Rafting en el cordillerano Río Cautín con posibilidad de chapuzón y avistamiento de aves.': 'A summer favorite. Rafting on the mountain Río Cautín, with chances for a swim and birdwatching.',
      'Para quienes buscan adrenalina. 6 km de descenso en kayak tras inducción y práctica.': 'For adrenaline seekers. A 6 km kayak descent after instruction and practice.',
      'Apta para toda la familia incluidos principiantes. Inducción completa al equipo y técnica.': 'Suitable for the whole family, including beginners. Full introduction to gear and technique.',
      'Galería': 'Gallery',
      'La': 'The',
      'en imágenes': 'in images',
      'Dónde quedarse': 'Where to stay',
      'Alojamientos': 'Recommended',
      'recomendados': 'lodging',
      'Condiciones actuales': 'Current conditions',
      'Revisa el clima': 'Check the weather',
      'antes de tu aventura': 'before your adventure',
      'años de experiencia': 'years of experience',
      'volcanes activos': 'active volcanoes',
      'actividades': 'activities',
      'Antes de venir': 'Before coming',
      'Planifica': 'Plan',
      'bien tu viaje': 'your trip well',
      'Reserva con anticipación': 'Book in advance',
      'Chequea el clima': 'Check the weather',
      'Vestimenta adecuada': 'Proper clothing',
      'Cuídate y cuídanos': 'Take care of yourself and of us',
      'Respeta la naturaleza. El uso del equipo de seguridad es obligatorio.': 'Respect nature. Safety gear is mandatory.',
      'Contáctanos': 'Contact us',
      '¿Listo para': 'Ready for',
      'la aventura?': 'the adventure?',
      'Dirección': 'Address',
      'Teléfono / WhatsApp': 'Phone / WhatsApp',
      'Enviar email': 'Send email',
      'Malalcahuello, Araucanía · Desde 2016': 'Malalcahuello, Araucanía · Since 2016',
      'En la tierra no hay cielo, pero hay partes de él.': 'There is no heaven on earth, but there are pieces of it.'
    },
    pt: {
      'Cargando ETNIKA': 'Carregando ETNIKA',
      'Nosotros': 'Sobre nós',
      'Actividades': 'Atividades',
      'Alojamiento': 'Hospedagem',
      'Clima': 'Clima',
      'Reservar': 'Reservar',
      'Contacto': 'Contato',
      'Donde la': 'Onde a',
      'aventura': 'aventura',
      'comienza.': 'começa.',
      'Volcanes,': 'Vulcões,',
      'ríos': 'rios',
      'y bosques.': 'e bosques.',
      'Guías Certificados': 'Guias certificados',
      'Cada ruta,': 'Cada rota,',
      'una historia': 'uma história',
      'que contar.': 'para contar.',
      'Tu aventura': 'Sua aventura',
      'te espera.': 'espera por você.',
      'Ver experiencias': 'Ver experiências',
      'Sobre nosotros': 'Sobre nós',
      'de montaña.': 'de montanha.',
      'Desde 2016': 'Desde 2016',
      'Desde el año 2016 entregamos experiencias en la Araucanía Andina. Somos del pueblo de Malalcahuello, ubicado a 120 km de Temuco hacia la cordillera, rodeados de volcanes, ríos, bosques y las 4 estaciones claramente definidas.': 'Desde 2016 entregamos experiências na Araucanía Andina. Somos do povoado de Malalcahuello, localizado a 120 km de Temuco em direção à cordilheira, rodeados por vulcões, rios, bosques e as quatro estações claramente definidas.',
      'Profesionales del turismo, dispuestos a que tus días en la Araucanía sean mágicos.': 'Profissionais do turismo, prontos para fazer com que seus dias na Araucanía sejam mágicos.',
      'Sensación': 'Sensação',
      'Humedad': 'Umidade',
      'Viento': 'Vento',
      'Lluvia hoy': 'Chuva hoje',
      'Experiencias': 'Experiências',
      'Elige tu': 'Escolha sua',
      'Filtra por categoría y encuentra la experiencia perfecta para ti.': 'Filtre por categoria e encontre a experiência perfeita para você.',
      '🌋 Volcanes': '🌋 Vulcões',
      '🛶 Río': '🛶 Rio',
      '⛷️ Invernal': '⛷️ Inverno',
      '📦 Paquetes': '📦 Pacotes',
      '✨ Otros': '✨ Outros',
      'Montañismo': 'Montanhismo',
      'Río': 'Rio',
      'Invernal': 'Inverno',
      'Paquete': 'Pacote',
      'Cabalgata': 'Cavalgada',
      'Giras': 'Viagens em grupo',
      'Traslado': 'Traslado',
      'Baja': 'Baixa',
      'Media': 'Média',
      'Alta': 'Alta',
      'Transporte': 'Transporte',
      'Guía certif.': 'Guia certific.',
      'Guía': 'Guia',
      'Guías certif.': 'Guias certific.',
      'Entrada': 'Ingresso',
      'Entradas': 'Ingressos',
      'Alimentación': 'Alimentação',
      'Equipo': 'Equipamento',
      'Desde': 'A partir de',
      'Dificultad': 'Dificuldade',
      'Precios por cantidad de personas': 'Preços por número de pessoas',
      'Ver precios': 'Ver preços',
      'Ocultar': 'Ocultar',
      'Arma tu grupo y ahorra': 'Monte seu grupo e economize',
      'Elige tu grupo': 'Escolha seu grupo',
      'Más personas, menor valor por persona': 'Mais pessoas, menor valor por pessoa',
      'Ahorra hasta': 'Economize até',
      'Hasta': 'Até',
      'menos por persona': 'menos por pessoa',
      'Ahorro comparado con la tarifa individual': 'Economia comparada com a tarifa individual',
      'por persona': 'por pessoa',
      'Tarifa individual': 'Tarifa individual',
      'Ahorras': 'Você economiza',
      'Mejor precio': 'Melhor preço',
      'persona': 'pessoa',
      'personas': 'pessoas',
      'Consultar': 'Consultar',
      'Galería': 'Galeria',
      'en imágenes': 'em imagens',
      'Dónde quedarse': 'Onde ficar',
      'Alojamientos': 'Hospedagens',
      'recomendados': 'recomendadas',
      'Condiciones actuales': 'Condições atuais',
      'Revisa el clima': 'Confira o clima',
      'antes de tu aventura': 'antes da sua aventura',
      'años de experiencia': 'anos de experiência',
      'volcanes activos': 'vulcões ativos',
      'actividades': 'atividades',
      'Antes de venir': 'Antes de vir',
      'Planifica': 'Planeje',
      'bien tu viaje': 'bem sua viagem',
      'Reserva con anticipación': 'Reserve com antecedência',
      'Chequea el clima': 'Confira o clima',
      'Vestimenta adecuada': 'Roupa adequada',
      'Contáctanos': 'Fale conosco',
      '¿Listo para': 'Pronto para',
      'la aventura?': 'a aventura?',
      'Dirección': 'Endereço',
      'Teléfono / WhatsApp': 'Telefone / WhatsApp',
      'Enviar email': 'Enviar email',
      'En la tierra no hay cielo, pero hay partes de él.': 'Na terra não há céu, mas há partes dele.'
    }
  };

  const EXTRA_I18N = {
    en: {
      'Ciclovía Malalcahuello — Manzanar': 'Bike Route Malalcahuello — Manzanar',
      'Ciclovía Lonquimay — Túnel Las Raíces': 'Bike Route Lonquimay — Túnel Las Raíces',
      'Hiking con Raquetas — Volcán Lonquimay': 'Snowshoe Hiking — Volcán Lonquimay',
      'Inducción Ski & Snowboard': 'Ski & Snowboard Intro Lesson',
      'Backcountry — Randonnée & Splitboard': 'Backcountry — Randonnée & Splitboard',
      'Antigua línea férrea convertida en ciclovía, inmersa en bosque nativo con túneles y miradores.': 'An old railway converted into a bike route, surrounded by native forest, tunnels, and viewpoints.',
      'Bosques milenarios hasta una laguna de origen volcánico, con vistas al Volcán Lonquimay.': 'Ancient forests leading to a volcanic-origin lagoon, with views of Volcán Lonquimay.',
      'Profesora de equitación trilingüe. Cruces de esteros con vistas al Volcán Sierra Nevada.': 'Trilingual riding instructor. Stream crossings with views of Volcán Sierra Nevada.',
      'Campo abierto': 'Open field',
      'Vista Sierra Nevada': 'Sierra Nevada view',
      'Guía trilingüe': 'Trilingual guide',
      'Valle de Lonquimay rodeado de montañas, ríos y aves. Incluye el famoso Túnel de Las Raíces.': 'Valle de Lonquimay surrounded by mountains, rivers, and birds. Includes the famous Túnel de Las Raíces.',
      'Ascenso en trekking con equipo randonnée para luego disfrutar una bajada épica en nieve virgen.': 'A trekking ascent with randonnée gear, followed by an epic descent on untouched snow.',
      'Clases en centro Ski Corralco, Skinolimit o fuera de pista. Elige el sector que más te acomode.': 'Lessons at Ski Corralco, Skinolimit, or off-piste. Choose the area that suits you best.',
      'Recorre las laderas nevadas del Lonquimay con raquetas de nieve para explorar paisajes únicos en invierno.': 'Explore Lonquimay’s snowy slopes with snowshoes and discover unique winter landscapes.',
      'Túneles': 'Tunnels',
      'Túnel más largo Chile': 'Longest tunnel in Chile',
      'Nieve virgen': 'Untouched snow',
      'Bajada ski/snow': 'Ski/snow descent',
      'Desde 7 años': 'From 7 years old',
      'Nieve profunda': 'Deep snow',
      'Amanecer': 'Sunrise',
      'Selección de los mejores alojamientos de Malalcahuello, coordinados directamente con Etnika.': 'A selection of the best lodging in Malalcahuello, coordinated directly with Etnika.',
      'Cabañas & Glamping': 'Cabins & Glamping',
      'Cabañas': 'Cabins',
      'Condominio': 'Condominium',
      'Malalcahuello tiene las 4 estaciones claramente definidas. Planifica bien tu visita y consulta las condiciones de la ruta.': 'Malalcahuello has four clearly defined seasons. Plan your visit well and check route conditions.',
      'Despejado': 'Clear sky',
      'Mayormente despejado': 'Mostly clear',
      'Principalmente despejado': 'Mostly clear',
      'Parcialmente nublado': 'Partly cloudy',
      'Nublado': 'Cloudy',
      'Niebla': 'Fog',
      'Niebla con escarcha': 'Freezing fog',
      'Neblina': 'Fog',
      'Llovizna': 'Drizzle',
      'Llovizna ligera': 'Light drizzle',
      'Llovizna moderada': 'Moderate drizzle',
      'Llovizna intensa': 'Heavy drizzle',
      'Lluvia': 'Rain',
      'Lluvia ligera': 'Light rain',
      'Lluvia moderada': 'Moderate rain',
      'Lluvia intensa': 'Heavy rain',
      'Nieve': 'Snow',
      'Nieve ligera': 'Light snow',
      'Nieve moderada': 'Moderate snow',
      'Nieve intensa': 'Heavy snow',
      'Granizo de nieve': 'Snow grains',
      'Chubascos': 'Showers',
      'Chubascos ligeros': 'Light showers',
      'Chubascos moderados': 'Moderate showers',
      'Chubascos fuertes': 'Heavy showers',
      'Chubascos de nieve': 'Snow showers',
      'Chubascos de nieve fuertes': 'Heavy snow showers',
      'Tormenta': 'Thunderstorm',
      'Tormenta eléctrica': 'Thunderstorm',
      'Tormenta con granizo': 'Thunderstorm with hail',
      'Tormenta intensa con granizo': 'Severe thunderstorm with hail',
      'Variable': 'Variable',
      'lluvia': 'rain',
      'ráf.': 'gusts',
      'Viento fuerte: confirma la salida guiada.': 'Strong wind: confirm the guided departure.',
      'Posible nieve: revisa ruta y cadenas.': 'Possible snow: check the route and bring chains.',
      'Alta probabilidad de lluvia: lleva impermeable.': 'High chance of rain: bring a waterproof jacket.',
      'UV alto: bloqueador, lentes y gorro.': 'High UV: sunscreen, sunglasses, and hat.',
      'Condiciones útiles para planificar tu actividad.': 'Useful conditions to plan your activity.',
      'No disponible': 'Unavailable',
      'No se pudo cargar el clima. Intenta más tarde.': 'Weather could not be loaded. Please try again later.',
      'Consulta condiciones los días previos. Si hay nieve en ruta, lleva cadenas.': 'Check conditions in the days before your trip. If there is snow on the road, bring chains.',
      'Capas, zapatillas de trekking, polar, impermeable, gorro y guantes.': 'Layers, trekking shoes, fleece, waterproof jacket, hat, and gloves.',
      'Mínimo 48 hrs antes. 50% del valor confirma tu cupo.': 'At least 48 hours in advance. 50% of the price confirms your spot.',
      'Estamos en Malalcahuello, Chile. Escríbenos y organizamos juntos tu experiencia perfecta.': 'We are in Malalcahuello, Chile. Write to us and we will organize your perfect experience together.',
      'Habla con nosotros': 'Talk to us',
      'Escribir por WhatsApp': 'Message us on WhatsApp',
      'Contactar por WhatsApp': 'Contact us on WhatsApp'
    },
    pt: {
      'Ciclovía Malalcahuello — Manzanar': 'Ciclovia Malalcahuello — Manzanar',
      'Ciclovía Lonquimay — Túnel Las Raíces': 'Ciclovia Lonquimay — Túnel Las Raíces',
      'Hiking con Raquetas — Volcán Lonquimay': 'Caminhada com Raquetes — Volcán Lonquimay',
      'Inducción Ski & Snowboard': 'Aula introdutória de Ski & Snowboard',
      'Backcountry — Randonnée & Splitboard': 'Backcountry — Randonnée & Splitboard',
      'Antigua línea férrea convertida en ciclovía, inmersa en bosque nativo con túneles y miradores.': 'Antiga linha férrea transformada em ciclovia, imersa em bosque nativo com túneis e mirantes.',
      'Bosques milenarios hasta una laguna de origen volcánico, con vistas al Volcán Lonquimay.': 'Bosques milenares até uma lagoa de origem vulcânica, com vistas para o Volcán Lonquimay.',
      'Profesora de equitación trilingüe. Cruces de esteros con vistas al Volcán Sierra Nevada.': 'Professora de equitação trilíngue. Travessias de riachos com vistas para o Volcán Sierra Nevada.',
      'Campo abierto': 'Campo aberto',
      'Vista Sierra Nevada': 'Vista Sierra Nevada',
      'Guía trilingüe': 'Guia trilíngue',
      'Valle de Lonquimay rodeado de montañas, ríos y aves. Incluye el famoso Túnel de Las Raíces.': 'Valle de Lonquimay rodeado por montanhas, rios e aves. Inclui o famoso Túnel de Las Raíces.',
      'Ascenso en trekking con equipo randonnée para luego disfrutar una bajada épica en nieve virgen.': 'Subida em trekking com equipamento de randonnée para depois curtir uma descida épica em neve virgem.',
      'Clases en centro Ski Corralco, Skinolimit o fuera de pista. Elige el sector que más te acomode.': 'Aulas no Ski Corralco, Skinolimit ou fora de pista. Escolha o setor que mais combina com você.',
      'Recorre las laderas nevadas del Lonquimay con raquetas de nieve para explorar paisajes únicos en invierno.': 'Percorra as encostas nevadas de Lonquimay com raquetes de neve para explorar paisagens únicas no inverno.',
      'Túneles': 'Túneis',
      'Túnel más largo Chile': 'Túnel mais longo do Chile',
      'Nieve virgen': 'Neve virgem',
      'Bajada ski/snow': 'Descida ski/snow',
      'Desde 7 años': 'A partir de 7 anos',
      'Nieve profunda': 'Neve profunda',
      'Amanecer': 'Nascer do sol',
      'Selección de los mejores alojamientos de Malalcahuello, coordinados directamente con Etnika.': 'Seleção das melhores hospedagens de Malalcahuello, coordenadas diretamente com a Etnika.',
      'Cabañas & Glamping': 'Cabanas & Glamping',
      'Cabañas': 'Cabanas',
      'Condominio': 'Condomínio',
      'Malalcahuello tiene las 4 estaciones claramente definidas. Planifica bien tu visita y consulta las condiciones de la ruta.': 'Malalcahuello tem as quatro estações claramente definidas. Planeje bem sua visita e confira as condições da rota.',
      'Despejado': 'Céu limpo',
      'Mayormente despejado': 'Predominantemente limpo',
      'Principalmente despejado': 'Predominantemente limpo',
      'Parcialmente nublado': 'Parcialmente nublado',
      'Nublado': 'Nublado',
      'Niebla': 'Neblina',
      'Niebla con escarcha': 'Neblina com geada',
      'Neblina': 'Neblina',
      'Llovizna': 'Garoa',
      'Llovizna ligera': 'Garoa fraca',
      'Llovizna moderada': 'Garoa moderada',
      'Llovizna intensa': 'Garoa intensa',
      'Lluvia': 'Chuva',
      'Lluvia ligera': 'Chuva fraca',
      'Lluvia moderada': 'Chuva moderada',
      'Lluvia intensa': 'Chuva forte',
      'Nieve': 'Neve',
      'Nieve ligera': 'Neve fraca',
      'Nieve moderada': 'Neve moderada',
      'Nieve intensa': 'Neve forte',
      'Granizo de nieve': 'Grãos de neve',
      'Chubascos': 'Pancadas de chuva',
      'Chubascos ligeros': 'Pancadas fracas',
      'Chubascos moderados': 'Pancadas moderadas',
      'Chubascos fuertes': 'Pancadas fortes',
      'Chubascos de nieve': 'Pancadas de neve',
      'Chubascos de nieve fuertes': 'Pancadas fortes de neve',
      'Tormenta': 'Tempestade',
      'Tormenta eléctrica': 'Tempestade elétrica',
      'Tormenta con granizo': 'Tempestade com granizo',
      'Tormenta intensa con granizo': 'Tempestade intensa com granizo',
      'Variable': 'Variável',
      'lluvia': 'chuva',
      'ráf.': 'raj.',
      'Viento fuerte: confirma la salida guiada.': 'Vento forte: confirme a saída guiada.',
      'Posible nieve: revisa ruta y cadenas.': 'Possível neve: confira a rota e leve correntes.',
      'Alta probabilidad de lluvia: lleva impermeable.': 'Alta chance de chuva: leve impermeável.',
      'UV alto: bloqueador, lentes y gorro.': 'UV alto: protetor solar, óculos e gorro.',
      'Condiciones útiles para planificar tu actividad.': 'Condições úteis para planejar sua atividade.',
      'No disponible': 'Indisponível',
      'No se pudo cargar el clima. Intenta más tarde.': 'Não foi possível carregar o clima. Tente novamente mais tarde.',
      'Consulta condiciones los días previos. Si hay nieve en ruta, lleva cadenas.': 'Confira as condições nos dias anteriores. Se houver neve na rota, leve correntes.',
      'Capas, zapatillas de trekking, polar, impermeable, gorro y guantes.': 'Camadas de roupa, tênis de trekking, fleece, impermeável, gorro e luvas.',
      'Mínimo 48 hrs antes. 50% del valor confirma tu cupo.': 'No mínimo 48 horas antes. 50% do valor confirma sua vaga.',
      'Estamos en Malalcahuello, Chile. Escríbenos y organizamos juntos tu experiencia perfecta.': 'Estamos em Malalcahuello, Chile. Escreva para nós e organizamos juntos sua experiência perfeita.',
      'Habla con nosotros': 'Fale conosco',
      'Escribir por WhatsApp': 'Enviar mensagem no WhatsApp',
      'Contactar por WhatsApp': 'Contato pelo WhatsApp'
    }
  };

  Object.keys(EXTRA_I18N).forEach(lang => {
    I18N[lang] = Object.assign(I18N[lang] || {}, EXTRA_I18N[lang]);
  });

  const V20_I18N = {
    en: {
      '¿Qué experiencia buscas? Elige cómo quieres vivir la Araucanía Andina.': 'What experience are you looking for? Choose how you want to explore Andean Araucanía.',
      'Experiencias Etnika': 'Etnika Experiences', 'Selección especial': 'Special selection',
      'Naturaleza': 'Nature', 'Bosques, lagunas y parques': 'Forests, lagoons and parks',
      'Aventura': 'Adventure', 'Montaña, ríos y desafíos': 'Mountains, rivers and challenges',
      'Relax': 'Relax', 'Termas & Relax': 'Hot Springs & Relax', 'Bienestar y descanso': 'Wellness and rest',
      'Nieve': 'Snow', 'Invierno en la cordillera': 'Winter in the mountains',
      'Temporada': 'Season', 'Verano': 'Summer', 'Otoño': 'Autumn', 'Invierno': 'Winter', 'Primavera': 'Spring',
      'Fácil': 'Easy', 'Moderada': 'Moderate', 'Difícil': 'Difficult', 'Duración': 'Duration',
      '2–4 horas': '2–4 hours', 'Medio día': 'Half day', 'Limpiar filtros': 'Clear filters',
      'Qué incluye': 'What is included', 'servicio': 'service', 'servicios': 'services', 'Servicios incluidos': 'Included services',
      'Lugar': 'Location', 'Distancia': 'Distance', 'Dificultad': 'Difficulty', 'Sectores': 'Areas', 'Clases': 'Lessons',
      'Apertura de temporada desde el 15 de noviembre.': 'Season opens on November 15.',
      'Disponible desde noviembre, sujeto a la apertura de accesos por nieve.': 'Available from November, subject to snow-access openings.',
      'Transporte en van privada': 'Private van transport', 'Transporte en van': 'Van transport', 'Transporte': 'Transport',
      'Guía certificado local': 'Certified local guide', 'Guía local certificado': 'Certified local guide',
      'Guía de montaña certificado ANGM local': 'Local ANGM-certified mountain guide',
      'Guía de montaña adicional para grupos de 4 a 6 personas': 'Additional mountain guide for groups of 4 to 6 people',
      'Guía adicional para grupos de 4 a 6 personas': 'Additional guide for groups of 4 to 6 people',
      'Snack y brunch': 'Snack and brunch', 'Snack': 'Snack', 'Fotografías': 'Photos', 'Fotografías de la experiencia': 'Experience photos',
      'Interpretación natural y cultural': 'Natural and cultural interpretation',
      'Seguro de actividad': 'Activity insurance', 'Seguro de actividad para pasajeros chilenos': 'Activity insurance for Chilean passengers',
      'Raquetas de nieve, bastones y polainas': 'Snowshoes, poles and gaiters',
      'Raquetas de nieve, bastones, polainas y crampones': 'Snowshoes, poles, gaiters and crampons',
      'Raquetas de nieve, polainas y bastones de trekking': 'Snowshoes, gaiters and trekking poles',
      'Equipo técnico: casco, arnés, piolet y crampones': 'Technical gear: helmet, harness, ice axe and crampons',
      'Equipo de randonnée': 'Randonnée equipment', 'Entrada al Parque Nacional Conguillío': 'Parque Nacional Conguillío entry',
      'Entrada a Patachoique': 'Patachoique entry', 'Entrada a Salto del Indio': 'Salto del Indio entry',
      'Ticket y clase': 'Lift ticket and lesson', 'Equipo de ski: botas, skis, bastones y casco': 'Ski equipment: boots, skis, poles and helmet',
      'Elegir fecha': 'Choose date', 'Tarifa publicada': 'Published rate',
      'Reserva tu experiencia': 'Book your experience', 'Planifica tu aventura': 'Plan your adventure',
      'Número de personas': 'Number of people', 'Fecha de la experiencia': 'Experience date',
      'Consultar disponibilidad por WhatsApp': 'Check availability on WhatsApp', 'Cerrar': 'Close',
      '3–4 km aprox. · 3–4 horas ida y vuelta': 'Approx. 3–4 km · 3–4 hours round trip',
      '6 km aprox. · 6 horas ida y vuelta': 'Approx. 6 km · 6 hours round trip',
      'Verano · 3–4 hrs': 'Summer · 3–4 hrs', 'Invierno · 6 hrs': 'Winter · 6 hrs', '3–6 km aprox.': 'Approx. 3–6 km',
      'Red turística': 'Tourism network', 'Respaldo y': 'Support and', 'colaboración local': 'local collaboration',
      'Conectamos nuestras experiencias con instituciones y alojamientos que fortalecen el turismo en la Araucanía Andina.': 'We connect our experiences with institutions and lodging partners that strengthen tourism in Andean Araucanía.',
      'Turismo formal': 'Formal tourism', 'Servicio Nacional de Turismo': 'National Tourism Service',
      'SERNATUR promueve la formalización, la calidad y la seguridad de los servicios turísticos en Chile.': 'SERNATUR promotes formalization, quality and safety across tourism services in Chile.',
      'Conocer SERNATUR': 'Learn about SERNATUR', 'Alojamiento colaborador': 'Lodging partner',
      'Coordinamos experiencias locales para sus huéspedes, conectando descanso termal y aventura en la cordillera.': 'We coordinate local experiences for their guests, connecting thermal relaxation with mountain adventure.',
      'Visitar el hotel': 'Visit the hotel'
    },
    pt: {
      '¿Qué experiencia buscas? Elige cómo quieres vivir la Araucanía Andina.': 'Que experiência você procura? Escolha como quer viver a Araucanía Andina.',
      'Experiencias Etnika': 'Experiências Etnika', 'Selección especial': 'Seleção especial',
      'Naturaleza': 'Natureza', 'Bosques, lagunas y parques': 'Bosques, lagoas e parques',
      'Aventura': 'Aventura', 'Montaña, ríos y desafíos': 'Montanhas, rios e desafios',
      'Relax': 'Relax', 'Termas & Relax': 'Termas & Relax', 'Bienestar y descanso': 'Bem-estar e descanso',
      'Nieve': 'Neve', 'Invierno en la cordillera': 'Inverno na cordilheira',
      'Temporada': 'Temporada', 'Verano': 'Verão', 'Otoño': 'Outono', 'Invierno': 'Inverno', 'Primavera': 'Primavera',
      'Fácil': 'Fácil', 'Moderada': 'Moderada', 'Difícil': 'Difícil', 'Duración': 'Duração',
      '2–4 horas': '2–4 horas', 'Medio día': 'Meio dia', 'Limpiar filtros': 'Limpar filtros',
      'Qué incluye': 'O que inclui', 'servicio': 'serviço', 'servicios': 'serviços', 'Servicios incluidos': 'Serviços incluídos',
      'Lugar': 'Local', 'Distancia': 'Distância', 'Dificultad': 'Dificuldade', 'Sectores': 'Setores', 'Clases': 'Aulas',
      'Apertura de temporada desde el 15 de noviembre.': 'Abertura da temporada em 15 de novembro.',
      'Disponible desde noviembre, sujeto a la apertura de accesos por nieve.': 'Disponível a partir de novembro, sujeito à abertura dos acessos por neve.',
      'Transporte en van privada': 'Transporte em van privativa', 'Transporte en van': 'Transporte em van', 'Transporte': 'Transporte',
      'Guía certificado local': 'Guia local certificado', 'Guía local certificado': 'Guia local certificado',
      'Guía de montaña certificado ANGM local': 'Guia de montanha local certificado pela ANGM',
      'Guía de montaña adicional para grupos de 4 a 6 personas': 'Guia de montanha adicional para grupos de 4 a 6 pessoas',
      'Guía adicional para grupos de 4 a 6 personas': 'Guia adicional para grupos de 4 a 6 pessoas',
      'Snack y brunch': 'Snack e brunch', 'Snack': 'Snack', 'Fotografías': 'Fotografias', 'Fotografías de la experiencia': 'Fotografias da experiência',
      'Interpretación natural y cultural': 'Interpretação natural e cultural',
      'Seguro de actividad': 'Seguro da atividade', 'Seguro de actividad para pasajeros chilenos': 'Seguro da atividade para passageiros chilenos',
      'Raquetas de nieve, bastones y polainas': 'Raquetes de neve, bastões e polainas',
      'Raquetas de nieve, bastones, polainas y crampones': 'Raquetes de neve, bastões, polainas e crampons',
      'Raquetas de nieve, polainas y bastones de trekking': 'Raquetes de neve, polainas e bastões de trekking',
      'Equipo técnico: casco, arnés, piolet y crampones': 'Equipamento técnico: capacete, arnês, piolet e crampons',
      'Equipo de randonnée': 'Equipamento de randonnée', 'Entrada al Parque Nacional Conguillío': 'Entrada do Parque Nacional Conguillío',
      'Entrada a Patachoique': 'Entrada de Patachoique', 'Entrada a Salto del Indio': 'Entrada do Salto del Indio',
      'Ticket y clase': 'Ticket e aula', 'Equipo de ski: botas, skis, bastones y casco': 'Equipamento de ski: botas, skis, bastões e capacete',
      'Elegir fecha': 'Escolher data', 'Tarifa publicada': 'Tarifa publicada',
      'Reserva tu experiencia': 'Reserve sua experiência', 'Planifica tu aventura': 'Planeje sua aventura',
      'Número de personas': 'Número de pessoas', 'Fecha de la experiencia': 'Data da experiência',
      'Consultar disponibilidad por WhatsApp': 'Consultar disponibilidade pelo WhatsApp', 'Cerrar': 'Fechar',
      '3–4 km aprox. · 3–4 horas ida y vuelta': 'Aprox. 3–4 km · 3–4 horas ida e volta',
      '6 km aprox. · 6 horas ida y vuelta': 'Aprox. 6 km · 6 horas ida e volta',
      'Verano · 3–4 hrs': 'Verão · 3–4 h', 'Invierno · 6 hrs': 'Inverno · 6 h', '3–6 km aprox.': 'Aprox. 3–6 km',
      'Red turística': 'Rede turística', 'Respaldo y': 'Apoio e', 'colaboración local': 'colaboração local',
      'Conectamos nuestras experiencias con instituciones y alojamientos que fortalecen el turismo en la Araucanía Andina.': 'Conectamos nossas experiências a instituições e meios de hospedagem que fortalecem o turismo na Araucanía Andina.',
      'Turismo formal': 'Turismo formal', 'Servicio Nacional de Turismo': 'Serviço Nacional de Turismo',
      'SERNATUR promueve la formalización, la calidad y la seguridad de los servicios turísticos en Chile.': 'O SERNATUR promove a formalização, a qualidade e a segurança dos serviços turísticos no Chile.',
      'Conocer SERNATUR': 'Conhecer o SERNATUR', 'Alojamiento colaborador': 'Hospedagem parceira',
      'Coordinamos experiencias locales para sus huéspedes, conectando descanso termal y aventura en la cordillera.': 'Coordenamos experiências locais para seus hóspedes, conectando descanso termal e aventura na cordilheira.',
      'Visitar el hotel': 'Visitar o hotel'
    }
  };

  Object.keys(V20_I18N).forEach(lang => {
    I18N[lang] = Object.assign(I18N[lang] || {}, V20_I18N[lang]);
  });

  const V23_I18N = {
    en: {
      'Colaboración territorial': 'Territorial collaboration',
      'Etnika forma parte de su red de guías y operadores locales en Curacautín.': 'Etnika is part of its network of local guides and operators in Curacautín.',
      'Explorar Kütralkura': 'Explore Kütralkura'
    },
    pt: {
      'Colaboración territorial': 'Colaboração territorial',
      'Etnika forma parte de su red de guías y operadores locales en Curacautín.': 'A Etnika faz parte de sua rede de guias e operadores locais em Curacautín.',
      'Explorar Kütralkura': 'Explorar Kütralkura'
    }
  };

  Object.keys(V23_I18N).forEach(lang => {
    I18N[lang] = Object.assign(I18N[lang] || {}, V23_I18N[lang]);
  });

  const V24_I18N = {
    en: {
      'Araucaria Milenaria + Laguna Pehuenco · Verano': 'Araucaria Milenaria + Laguna Pehuenco · Summer',
      'Araucaria Milenaria + Laguna Pehuenco · Invierno': 'Araucaria Milenaria + Laguna Pehuenco · Winter',
      'Trekking verano': 'Summer trekking',
      'Trekking invierno': 'Winter trekking',
      'Bosques milenarios y Laguna Pehuenco en una ruta de verano sin nieve, con vistas al Volcán Lonquimay.': 'Ancient forests and Laguna Pehuenco on a snow-free summer trail, with views of Volcán Lonquimay.',
      'Bosques nevados y Laguna Pehuenco con raquetas de nieve, una experiencia invernal para toda la familia.': 'Snow-covered forests and Laguna Pehuenco on snowshoes, a winter experience for the whole family.',
      'Galería de Araucaria Milenaria en invierno': 'Araucaria Milenaria winter gallery',
      'Laguna Pehuenco nevada en invierno': 'Snow-covered Laguna Pehuenco in winter',
      'Araucaria Milenaria nevada en invierno': 'Snow-covered Araucaria Milenaria in winter',
      'Foto anterior': 'Previous photo',
      'Foto siguiente': 'Next photo',
      '2,5 horas promedio': '2.5 hours average',
      'Laguna Captrén — P.N. Conguillío · Verano': 'Laguna Captrén — P.N. Conguillío · Summer',
      'Laguna Captrén — P.N. Conguillío · Invierno': 'Laguna Captrén — P.N. Conguillío · Winter',
      'Circuito familiar de verano en el Parque Nacional Conguillío con vista privilegiada al Volcán Llaima.': 'A family-friendly summer circuit in Parque Nacional Conguillío with privileged views of Volcán Llaima.',
      'Laguna Captrén entre bosques nevados, con vista al Volcán Llaima y equipo técnico para recorrer la nieve.': 'Laguna Captrén among snow-covered forests, with views of Volcán Llaima and technical gear for travelling over snow.',
      'Laguna Captrén en verano': 'Laguna Captrén in summer',
      'Laguna Captrén nevada en invierno': 'Snow-covered Laguna Captrén in winter',
      'Nieve': 'Snow'
    },
    pt: {
      'Araucaria Milenaria + Laguna Pehuenco · Verano': 'Araucaria Milenaria + Laguna Pehuenco · Verão',
      'Araucaria Milenaria + Laguna Pehuenco · Invierno': 'Araucaria Milenaria + Laguna Pehuenco · Inverno',
      'Trekking verano': 'Trekking de verão',
      'Trekking invierno': 'Trekking de inverno',
      'Bosques milenarios y Laguna Pehuenco en una ruta de verano sin nieve, con vistas al Volcán Lonquimay.': 'Bosques milenares e Laguna Pehuenco em uma trilha de verão sem neve, com vista para o Volcán Lonquimay.',
      'Bosques nevados y Laguna Pehuenco con raquetas de nieve, una experiencia invernal para toda la familia.': 'Bosques nevados e Laguna Pehuenco com raquetes de neve, uma experiência de inverno para toda a família.',
      'Galería de Araucaria Milenaria en invierno': 'Galeria de inverno da Araucaria Milenaria',
      'Laguna Pehuenco nevada en invierno': 'Laguna Pehuenco coberta de neve no inverno',
      'Araucaria Milenaria nevada en invierno': 'Araucaria Milenaria coberta de neve no inverno',
      'Foto anterior': 'Foto anterior',
      'Foto siguiente': 'Próxima foto',
      '2,5 horas promedio': 'Média de 2,5 horas',
      'Laguna Captrén — P.N. Conguillío · Verano': 'Laguna Captrén — P.N. Conguillío · Verão',
      'Laguna Captrén — P.N. Conguillío · Invierno': 'Laguna Captrén — P.N. Conguillío · Inverno',
      'Circuito familiar de verano en el Parque Nacional Conguillío con vista privilegiada al Volcán Llaima.': 'Circuito familiar de verão no Parque Nacional Conguillío, com vista privilegiada para o Volcán Llaima.',
      'Laguna Captrén entre bosques nevados, con vista al Volcán Llaima y equipo técnico para recorrer la nieve.': 'Laguna Captrén entre bosques nevados, com vista para o Volcán Llaima e equipamento técnico para percorrer a neve.',
      'Laguna Captrén en verano': 'Laguna Captrén no verão',
      'Laguna Captrén nevada en invierno': 'Laguna Captrén coberta de neve no inverno',
      'Nieve': 'Neve'
    }
  };

  Object.keys(V24_I18N).forEach(lang => {
    I18N[lang] = Object.assign(I18N[lang] || {}, V24_I18N[lang]);
  });

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  let i18nTextNodes = null;
  let i18nAttrElements = null;

  function collectTranslatableTextNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script, style, .lang-switcher, .mobile-lang-switcher')) return NodeFilter.FILTER_REJECT;
        return normalizeText(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function resetI18nCache() {
    i18nTextNodes = null;
    i18nAttrElements = null;
  }

  function getSelectedLanguage() {
    const saved = localStorage.getItem('etnika-lang');
    if (saved && I18N[saved]) return saved;
    const htmlLang = document.documentElement.lang || 'es';
    return htmlLang.startsWith('pt') ? 'pt' : (I18N[htmlLang] ? htmlLang : 'es');
  }

  function translatePhrase(value, lang = getSelectedLanguage()) {
    const key = normalizeText(value);
    if (!key || lang === 'es') return key;
    return I18N[lang]?.[key] || key;
  }

  function translateNodeText(node, lang) {
    if (!node.__originalText) node.__originalText = node.nodeValue;
    const original = node.__originalText;
    const key = normalizeText(original);
    if (!key) return;
    const translated = lang === 'es' ? key : I18N[lang]?.[key];
    node.nodeValue = translated ? original.replace(key, translated) : original;
  }

  function translateAttribute(el, attr, lang) {
    if (!el.hasAttribute(attr)) return;
    const store = `original${attr.replace(/[^a-z0-9]/gi, '')}`;
    if (!el.dataset[store]) el.dataset[store] = el.getAttribute(attr);
    const original = el.dataset[store];
    const key = normalizeText(original);
    if (!key) return;
    const translated = lang === 'es' ? original : I18N[lang]?.[key];
    el.setAttribute(attr, translated || original);
  }

  function applyLanguage(lang) {
    const selected = I18N[lang] ? lang : 'es';
    document.documentElement.lang = selected === 'pt' ? 'pt-BR' : selected;
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === selected);
      btn.setAttribute('aria-pressed', btn.dataset.lang === selected ? 'true' : 'false');
    });
    if (!i18nTextNodes) i18nTextNodes = collectTranslatableTextNodes();
    if (!i18nAttrElements) i18nAttrElements = Array.from(document.querySelectorAll('[aria-label], [title], [alt], [placeholder]'));
    i18nTextNodes.forEach(node => translateNodeText(node, selected));
    i18nAttrElements.forEach(el => {
      translateAttribute(el, 'aria-label', selected);
      translateAttribute(el, 'title', selected);
      translateAttribute(el, 'alt', selected);
      translateAttribute(el, 'placeholder', selected);
    });
    updateFilterResultsLanguage();
    localStorage.setItem('etnika-lang', selected);
  }

  function initLanguageSwitcher() {
    const initial = localStorage.getItem('etnika-lang') || 'es';
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
    });
    applyLanguage(initial);
  }

  window.setEtnikaLanguage = applyLanguage;

  function init() {
    const loaderVideoReady = startLoaderVideo();
    const heroVideoReady = startHeroVideo();
    const loaderProgressTimer = startVisualLoaderProgress();
    sizeCanvas();
    initBurger();
    initActivityExperienceData();
    initFilters();
    initSmoothScroll();
    initReveal();
    initGallery();
    initActivityCarousels();
    initWeather();
    initTourPricing();
    initActivityIncludes();
    initBookingFlow();
    initDifficultyLabels();
    initMediaPerformance();
    initLanguageSwitcher();

    // Mostrar primer caption inmediatamente
    if (captions.length) captions[0].classList.add('active');

    // El video reemplaza la descarga bloqueante de los 119 frames.
    Promise.all([
      loaderVideoReady,
      heroVideoReady,
      waitForMinimumLoaderTime()
    ]).then(() => {
      completeVisualLoaderProgress(loaderProgressTimer);
      hideLoader();
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
