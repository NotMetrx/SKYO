/**
 * SKYO Service Worker — PWA offline shell.
 * Caché estricto solo para assets locales de la aplicación y muestras FITS de demostración.
 */
const VERSION = 'skyo-v2.3.2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './lab.html',
  './icon.svg',
  './sw.js',
  './assets/css/main.css',
  './assets/css/lab.css',
  './assets/css/states.css',
  './assets/js/app.js',
  './assets/js/ui-states.js',
  './assets/js/cosmos3d.js',
  './assets/js/glb-lite.js',
  './assets/js/explorar.js',
  './assets/js/fases.js',
  './assets/js/sistema3d.js',
  './assets/js/hera3d.js',
  './assets/js/data.js',
  './assets/js/science-lab-ui.js',
  './assets/js/vendor/three.min.js',
  './assets/js/vendor/lottie.min.js',
  './assets/models/eclipse.glb',
  './assets/models/boveda.glb',
  './assets/js/science/lab.js',
  './assets/js/science/fits.js',
  './assets/js/science/wcs.js',
  './assets/js/science/pipeline.js',
  './assets/js/science/render.js',
  './assets/js/science/wasm-bridge.js',
  './assets/js/science/opfs.js',
  './assets/js/science/worker.js',
  './assets/img/hera.webp',
  './assets/img/logo.jpg',
  './assets/img/icon.svg',
  './assets/fonts/SpaceGrotesk-Light.otf',
  './assets/fonts/SpaceGrotesk-Regular.otf',
  './assets/fonts/SpaceGrotesk-Medium.otf',
  './assets/fonts/SpaceGrotesk-SemiBold.otf',
  './assets/fonts/SpaceGrotesk-Bold.otf',
  './assets/fonts/SpaceMono-Regular.ttf',
  './assets/fonts/SpaceMono-Bold.ttf',
  './data/sample-fits/epoca_A.fits',
  './data/sample-fits/epoca_B.fits',
  './data/manifests/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] No se pudo cachear:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request, { ignoreVary: true }).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Guardar respuestas exitosas en caché si son locales
        if (response.status === 200 && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/data/'))) {
          const clone = response.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
