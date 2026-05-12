/* ===================================================
   ÉTNIKA ECOAVENTURA — script.js
=================================================== */

// ===== NAV SCROLL =====
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navMobile  = document.getElementById('navMobile');

hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  navMobile.classList.toggle('open');
});

// Cerrar menú al hacer clic en un enlace
navMobile?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMobile.classList.remove('open');
  });
});

// ===== SCROLL SUAVE para anclas internas =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80; // altura del nav
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ===== INTERSECTION OBSERVER — animación fade-up =====
const fadeEls = document.querySelectorAll('.fade-up');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

fadeEls.forEach(el => observer.observe(el));

// ===== TABS DE TEMPORADAS =====
const tabs   = document.querySelectorAll('.season-tab');
const panels = document.querySelectorAll('.season-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    const panel = document.getElementById('panel-' + target);
    if (panel) {
      panel.classList.add('active');
      // re-trigger fade-up for new panel content
      panel.querySelectorAll('.fade-up').forEach(el => {
        el.classList.remove('visible');
        setTimeout(() => el.classList.add('visible'), 50);
      });
    }
  });
});

// ===== CONTADOR ANIMADO en cifras =====
function animateCounter(el, target, duration = 1800) {
  let start = null;
  const isPlus = el.dataset.target?.includes('+') || el.textContent.includes('+');
  const num = parseInt(target);

  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
    el.textContent = (isPlus ? '+' : '') + Math.floor(eased * num);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = (isPlus ? '+' : '') + num;
  };
  requestAnimationFrame(step);
}

const cifraNumbers = document.querySelectorAll('.cifra-number');

const cifraObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const text = el.textContent.trim();

      if (text === '100%') {
        let start = null;
        const step = (ts) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / 1600, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * 100) + '%';
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      } else if (text.startsWith('+')) {
        const num = parseInt(text.replace('+', '').replace(/\D/g, ''));
        let start = null;
        const step = (ts) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / 1800, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = '+' + Math.floor(eased * num);
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = '+' + num;
        };
        requestAnimationFrame(step);
      } else if (text.includes('+')) {
        const num = parseInt(text.replace(/\D/g, ''));
        let start = null;
        const step = (ts) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / 1500, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * num) + '+';
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = num + '+';
        };
        requestAnimationFrame(step);
      }

      cifraObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

cifraNumbers.forEach(el => cifraObserver.observe(el));

// ===== FORMULARIO — manejo básico (listo para Formspree) =====
const form    = document.getElementById('contactForm');
const formMsg = document.getElementById('formMsg');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = form.nombre.value.trim();
  const email  = form.email.value.trim();

  if (!nombre || !email) {
    showMsg('Por favor completa nombre y correo.', 'error');
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  btn.textContent = '⏳ Enviando...';
  btn.disabled = true;

  /* ── Cuando tengas Formspree, descomenta esto y borra el timeout ──
  try {
    const res = await fetch('https://formspree.io/f/TU_ID', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    });
    if (res.ok) {
      showMsg('¡Listo! Recibimos tu consulta. Te respondemos pronto 🌿', 'success');
      form.reset();
    } else {
      showMsg('Hubo un error. Escríbenos directo al WhatsApp.', 'error');
    }
  } catch {
    showMsg('Sin conexión. Contáctanos por WhatsApp.', 'error');
  } finally {
    btn.textContent = '✉️ Enviar Consulta';
    btn.disabled = false;
  }
  ── Fin bloque Formspree ── */

  // Simulación hasta conectar Formspree:
  setTimeout(() => {
    showMsg('¡Gracias ' + nombre + '! Recibimos tu consulta. Te respondemos a la brevedad 🌿', 'success');
    form.reset();
    btn.textContent = '✉️ Enviar Consulta';
    btn.disabled = false;
  }, 1200);
});

function showMsg(text, type) {
  formMsg.textContent = text;
  formMsg.style.display = 'block';
  formMsg.style.color = type === 'success' ? '#5C8A4A' : '#e05555';
}

// ===== INICIALIZAR fade-up visible para elementos en viewport =====
window.addEventListener('load', () => {
  fadeEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      el.classList.add('visible');
    }
  });
});
