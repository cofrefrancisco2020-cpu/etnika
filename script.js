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

  const pad = n => String(n).padStart(4, '0');
  const frameSrc = i => `${FRAMES_DIR}frames_${pad(i + 1)}.png`;

  /* ─────────────────────────────────────────
     ELEMENTOS
  ───────────────────────────────────────── */
  const loader      = document.getElementById('loader');
  const loaderFill  = document.getElementById('loader-fill');
  const loaderPct   = document.getElementById('loader-pct');
  const canvas      = document.getElementById('frame-canvas');
  const ctx         = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const heroSection = document.querySelector('.hero-frame-section');
  const scrollHint  = document.getElementById('scroll-hint');
  const header      = document.getElementById('header');
  const burger      = document.getElementById('burger');
  const mobileNav   = document.getElementById('mobile-nav');
  const captions    = document.querySelectorAll('.hcap');

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
      sx = (iW - sw) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, vpW, vpH);
  }

  /* ─────────────────────────────────────────
     PRECARGA DE FRAMES
  ───────────────────────────────────────── */
  const frames = new Array(TOTAL_FRAMES).fill(null);
  let loadedCount = 0;
  let allLoaded   = false;

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
     INICIALIZACIÓN
  ───────────────────────────────────────── */
  function init() {
    sizeCanvas();
    initBurger();
    initFilters();
    initSmoothScroll();
    initReveal();
    initGallery();

    // Mostrar primer caption inmediatamente
    if (captions.length) captions[0].classList.add('active');

    // Precargar frames y luego arrancar
    preloadFrames().then(() => {
      allLoaded = true;
      updateMetrics();
      currentIdx = -1;
      drawFrame(0);

      // Ocultar loader con fade
      if (loader) {
        loader.style.opacity    = '0';
        loader.style.visibility = 'hidden';
        setTimeout(() => { loader.style.display = 'none'; }, 650);
      }

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
