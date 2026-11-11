/* Instalar la web como app en el celular · Ingeniería Metalúrgica UTN FRC
   - Android / Chrome / Edge: usa el aviso nativo "Instalar app".
   - iPhone / iPad: muestra los pasos (Compartir › Agregar a inicio), porque Safari no tiene botón automático.
   - Cualquier elemento con data-instalar se convierte en botón de instalación. */
(function () {
  'use strict';
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  const ua = navigator.userAgent || '';
  const iOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const movil = iOS || android;
  const instalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const nombreApp = document.querySelector('link[rel="manifest"]')?.getAttribute('href')?.includes('panel') ? 'Panel IM' : 'Mi ingreso';
  let aviso = null;

  const botones = () => Array.from(document.querySelectorAll('[data-instalar]'));
  function actualizar() {
    const ver = !instalada() && (aviso || movil);
    botones().forEach(b => { b.hidden = !ver; });
  }

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); aviso = e; actualizar(); });
  window.addEventListener('appinstalled', () => { aviso = null; actualizar(); cerrar(); });

  let hoja = null;
  function cerrar() { if (hoja) hoja.hidden = true; }
  function mostrarPasos(modo) {
    if (!hoja) {
      hoja = document.createElement('div');
      hoja.className = 'im-sheet'; hoja.setAttribute('role', 'dialog'); hoja.setAttribute('aria-modal', 'true');
      hoja.addEventListener('click', e => { if (e.target === hoja || e.target.matches('[data-cerrar]')) cerrar(); });
      document.body.appendChild(hoja);
    }
    const encabezado = `<h3><img src="assets/img/icon-192.png" alt="">Instalá ${nombreApp} en tu celular</h3>`;
    let cuerpo;
    if (modo === 'nativo') {
      cuerpo = `<p>Queda como una app más, con su ícono en la pantalla de inicio. No ocupa casi lugar y no hace falta ir a ninguna tienda.</p>
        <button data-ok>📲 Instalar ahora</button>`;
    } else if (iOS) {
      cuerpo = `<p>En iPhone se instala desde <b>Safari</b> (si abriste el link desde Instagram o WhatsApp, primero tocá ⋯ › <b>Abrir en Safari</b>).</p>
        <ol><li>Tocá el botón <b>Compartir</b> <span class="k">⬆︎</span> (abajo en el centro, o arriba a la derecha en iPad).</li>
        <li>Deslizá y elegí <b>Agregar a inicio</b> <span class="k">＋</span>.</li>
        <li>Tocá <b>Agregar</b>. Listo: vas a ver el ícono <b>${nombreApp}</b> en tu pantalla.</li></ol>
        <button data-cerrar>Entendido</button>`;
    } else {
      cuerpo = `<p>Abrí esta página en <b>Chrome</b> (si estás dentro de Instagram o WhatsApp, tocá ⋮ › <b>Abrir en Chrome</b>).</p>
        <ol><li>Tocá el menú <span class="k">⋮</span> arriba a la derecha.</li>
        <li>Elegí <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</li>
        <li>Confirmá. Vas a ver el ícono <b>${nombreApp}</b> con tus otras apps.</li></ol>
        <button data-cerrar>Entendido</button>`;
    }
    hoja.innerHTML = `<div>${encabezado}${cuerpo}</div>`;
    const ok = hoja.querySelector('[data-ok]');
    if (ok) ok.onclick = instalar;
    hoja.hidden = false;
  }

  async function instalar() {
    if (aviso) {
      cerrar();
      aviso.prompt();
      try { await aviso.userChoice; } catch (e) {}
      aviso = null; actualizar();
    } else {
      mostrarPasos('pasos');
    }
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-instalar]');
    if (b) { e.preventDefault(); instalar(); }
  });

  // Llegó desde el botón "Descargar la app" de la web pública
  if (/[#&?]instalar\b/.test(location.hash + location.search) && !instalada()) {
    history.replaceState(null, '', location.pathname);
    setTimeout(() => mostrarPasos(aviso ? 'nativo' : 'pasos'), aviso ? 0 : 1200);
    window.addEventListener('beforeinstallprompt', () => { if (hoja && !hoja.hidden) mostrarPasos('nativo'); }, { once: true });
  }

  document.addEventListener('DOMContentLoaded', actualizar);
  actualizar();
})();
