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
    const raw     = (elapsed % HERO_CYCLE_MS) / HERO_CYCLE_MS;
    const captionRaw = (elapsed % CAPTION_CYCLE_MS) / CAPTION_CYCLE_MS;

    const idx = Math.min(TOTAL_FRAMES - 1, Math.floor(raw * TOTAL_FRAMES));

    if (idx !== currentIdx && frames[idx] && frames[idx].naturalWidth) {
      currentIdx = idx;
      drawCover(frames[idx]);
    }

    updateCaptionsAuto(captionRaw);
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
      });
  }

  /* ─────────────────────────────────────────
     INICIALIZACIÓN
  ───────────────────────────────────────── */
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

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
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
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script, style, .lang-switcher, .mobile-lang-switcher')) return NodeFilter.FILTER_REJECT;
        return normalizeText(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => translateNodeText(node, selected));
    document.querySelectorAll('[aria-label], [title], [alt], [placeholder]').forEach(el => {
      translateAttribute(el, 'aria-label', selected);
      translateAttribute(el, 'title', selected);
      translateAttribute(el, 'alt', selected);
      translateAttribute(el, 'placeholder', selected);
    });
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
    sizeCanvas();
    initBurger();
    initFilters();
    initSmoothScroll();
    initReveal();
    initGallery();
    initWeather();
    initLanguageSwitcher();

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
