/** PWA shell offline; no guarda por defecto observaciones NASA de terceros. */
const VERSION='skyo-local-shell-v1';
const FILES=['./','./index.html','./main.js','./worker.js','./styles.css',
  './src/fits.js','./src/wcs.js','./src/pipeline.js','./src/render.js',
  './src/wasm-bridge.js','./src/opfs.js','./manifest.webmanifest','./icon.svg',
  './demo/epoca_A.fits','./demo/epoca_B.fits'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin)return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));
});
