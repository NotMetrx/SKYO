/** Cache only the published static shell and user-requested runtime assets. */
const VERSION='development';
const FILES=[];
const RUNTIME=[];
const PREFIX=`skyo:${self.registration.scope}:`;
const CACHE=PREFIX+VERSION;
const staticUrls=new Set(FILES.map(file=>new URL(file,self.registration.scope).href));
const runtimeUrls=new Set(RUNTIME.map(file=>new URL(file,self.registration.scope).href));
const indexUrl=new URL('index.html',self.registration.scope).href;
function staticResponse(response) {
  // Own build files are identical across Origin; preserve every other Vary policy.
  if (response.headers.get('Vary')?.trim().toLowerCase() !== 'origin') return response;
  const headers=new Headers(response.headers);headers.delete('Vary');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for (const url of staticUrls) {
    const response=await fetch(url,{cache:'reload'});
    if(!response.ok) throw Error(`No se pudo preparar offline: ${url}`);
    await cache.put(url,staticResponse(response));
  }
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys()) if(key.startsWith(PREFIX)&&key!==CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  url.hash='';
  if(event.request.method!=='GET'||url.origin!==self.location.origin) return;
  const isRoot=url.href===self.registration.scope;
  const demoPrefix=new URL('data/sample-fits/',self.registration.scope).href;
  const demo=url.href===demoPrefix+'epoca_A.fits'||url.href===demoPrefix+'epoca_B.fits';
  const key=isRoot?indexUrl:url.href;
  if(!staticUrls.has(key)&&!runtimeUrls.has(key)&&!demo)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(key);if(hit)return hit;
    const response=await fetch(event.request);
    if((demo || runtimeUrls.has(key)) && response.ok) await cache.put(key,staticResponse(response.clone()));
    return response;
  })());
});

self.addEventListener('message',event=>{if(event.data==='activate') self.skipWaiting();});
