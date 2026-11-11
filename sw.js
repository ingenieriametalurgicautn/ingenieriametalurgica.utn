/* Service worker · Ingeniería Metalúrgica UTN FRC
   Permite instalar la web como app y que abra rápido. Nunca guarda datos personales:
   todo lo que va a la planilla (script.google.com) pasa directo por la red. */
const VERSION = 'im-v4-2';
const BASE = ['./', 'index.html', 'mi-ingreso.html', 'admin.html', 'privacidad.html',
  'assets/css/estilos.css', 'assets/css/portal.css', 'assets/css/admin.css', 'assets/css/app.css',
  'assets/js/config.js', 'assets/js/portal.js', 'assets/js/admin.js', 'assets/js/sitio.js', 'assets/js/app.js',
  'assets/img/logo.jpg', 'assets/img/logo-redondo.png', 'assets/img/icon-192.png', 'assets/img/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // planilla, Google y fuentes: siempre red
  if (req.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname)) {
    // Páginas y código: primero la red (siempre la última versión); sin conexión, la copia guardada
    e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(k => k.put(req, c)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('mi-ingreso.html'))));
  } else {
    // Imágenes: la copia guardada y se actualiza por detrás
    e.respondWith(caches.match(req).then(hit => {
      const red = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(k => k.put(req, c)); } return r; }).catch(() => hit);
      return hit || red;
    }));
  }
});
